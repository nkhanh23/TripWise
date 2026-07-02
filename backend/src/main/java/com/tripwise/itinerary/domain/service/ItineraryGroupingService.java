package com.tripwise.itinerary.domain.service;

import com.tripwise.itinerary.domain.ItineraryDayPlan;
import com.tripwise.itinerary.domain.ItineraryItemPlan;
import com.tripwise.itinerary.domain.TimeSlot;
import com.tripwise.place.domain.entity.Place;
import com.tripwise.route.domain.RouteResult;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.*;
import java.util.function.BiFunction;
import java.util.stream.Collectors;

@Service
public class ItineraryGroupingService {

    private static final LocalTime MORNING_START = LocalTime.of(8, 0);
    private static final LocalTime AFTERNOON_START = LocalTime.of(13, 30);
    private static final LocalTime EVENING_START = LocalTime.of(18, 0);
    private static final int TRANSIT_BUFFER_MINUTES = 30;

    public List<ItineraryDayPlan> groupPlaces(List<Place> places, int numDays, int placesPerDay) {
        return groupPlaces(places, numDays, placesPerDay, this::buildStraightLineRoute);
    }

    public List<ItineraryDayPlan> groupPlaces(
            List<Place> places,
            int numDays,
            int placesPerDay,
            BiFunction<Place, Place, RouteResult> routeProvider
    ) {
        if (places == null || places.isEmpty() || numDays <= 0) {
            return Collections.emptyList();
        }

        // 1. Partition places into days using constrained clustering
        List<List<Place>> dayClusters = partitionPlaces(places, numDays, placesPerDay, routeProvider);

        // 2. For each day, optimize route and assign slots/times
        List<ItineraryDayPlan> dayPlans = new ArrayList<>();
        for (int i = 0; i < dayClusters.size(); i++) {
            List<Place> cluster = dayClusters.get(i);
            if (cluster.isEmpty()) {
                dayPlans.add(new ItineraryDayPlan(i + 1, Collections.emptyList()));
                continue;
            }

            // Route Optimization: order places using nearest neighbor starting from seed (first element)
            List<Place> route = optimizeRoute(cluster, routeProvider);

            // Assign slots and times
            List<ItineraryItemPlan> items = scheduleRoute(route, routeProvider);

            dayPlans.add(new ItineraryDayPlan(i + 1, items));
        }

        return dayPlans;
    }

    private List<List<Place>> partitionPlaces(
            List<Place> places,
            int numDays,
            int placesPerDay,
            BiFunction<Place, Place, RouteResult> routeProvider
    ) {
        List<List<Place>> clusters = new ArrayList<>();
        for (int i = 0; i < numDays; i++) {
            clusters.add(new ArrayList<>());
        }

        // If places count is small, assign each to a day
        if (places.size() <= numDays) {
            for (int i = 0; i < places.size(); i++) {
                clusters.get(i).add(places.get(i));
            }
            return clusters;
        }

        // Select K seeds furthest from each other
        List<Place> seeds = selectSeeds(places, numDays, routeProvider);

        // Add seeds to clusters
        Set<Long> assignedIds = new HashSet<>();
        for (int i = 0; i < numDays; i++) {
            Place seed = seeds.get(i);
            clusters.get(i).add(seed);
            assignedIds.add(seed.getId());
        }

        // Unassigned places
        List<Place> unassigned = places.stream()
                .filter(p -> !assignedIds.contains(p.getId()))
                .collect(Collectors.toList());

        // Assign remaining places to the nearest cluster with space constraint
        while (!unassigned.isEmpty()) {
            double minDistance = Double.MAX_VALUE;
            Place bestPlace = null;
            int bestClusterIdx = -1;

            for (Place place : unassigned) {
                for (int c = 0; c < numDays; c++) {
                    List<Place> cluster = clusters.get(c);
                    if (cluster.size() >= placesPerDay) {
                        continue;
                    }
                    Place seed = cluster.get(0); // seed is the representative
                    double dist = getRouteDistance(seed, place, routeProvider);
                    if (dist < minDistance) {
                        minDistance = dist;
                        bestPlace = place;
                        bestClusterIdx = c;
                    }
                }
            }

            if (bestPlace != null && bestClusterIdx != -1) {
                clusters.get(bestClusterIdx).add(bestPlace);
                unassigned.remove(bestPlace);
            } else {
                // If all target capacity slots are full, assign remaining to any cluster with minimum distance
                Place place = unassigned.get(0);
                double nearestDist = Double.MAX_VALUE;
                int nearestIdx = 0;
                for (int c = 0; c < numDays; c++) {
                    Place seed = clusters.get(c).get(0);
                    double dist = getRouteDistance(seed, place, routeProvider);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestIdx = c;
                    }
                }
                clusters.get(nearestIdx).add(place);
                unassigned.remove(0);
            }
        }

        return clusters;
    }

    private List<Place> selectSeeds(List<Place> places, int numDays, BiFunction<Place, Place, RouteResult> routeProvider) {
        List<Place> seeds = new ArrayList<>();

        // Calculate centroid of all places
        double avgLat = places.stream().mapToDouble(p -> p.getLocation() != null ? p.getLocation().getY() : 0.0).average().orElse(0.0);
        double avgLon = places.stream().mapToDouble(p -> p.getLocation() != null ? p.getLocation().getX() : 0.0).average().orElse(0.0);

        // Find Place furthest from centroid
        Place firstSeed = places.stream()
                .min(Comparator.comparingDouble(p -> -calculateHaversineDistance(avgLat, avgLon, 
                        p.getLocation() != null ? p.getLocation().getY() : 0.0, 
                        p.getLocation() != null ? p.getLocation().getX() : 0.0)))
                .orElse(places.get(0));

        seeds.add(firstSeed);

        // Find remaining K-1 seeds
        while (seeds.size() < numDays && seeds.size() < places.size()) {
            Place bestNextSeed = null;
            double maxMinDist = -1.0;

            for (Place candidate : places) {
                if (seeds.contains(candidate)) continue;

                // Find minimum distance to already selected seeds
                double minDist = seeds.stream()
                        .mapToDouble(seed -> getRouteDistance(seed, candidate, routeProvider))
                        .min()
                        .orElse(Double.MAX_VALUE);

                // We want the candidate that maximizes this minimum distance (spread out)
                if (minDist > maxMinDist) {
                    maxMinDist = minDist;
                    bestNextSeed = candidate;
                }
            }

            if (bestNextSeed != null) {
                seeds.add(bestNextSeed);
            } else {
                break;
            }
        }

        // Fallback if not enough seeds
        while (seeds.size() < numDays) {
            for (Place p : places) {
                if (!seeds.contains(p)) {
                    seeds.add(p);
                    if (seeds.size() == numDays) break;
                }
            }
        }

        return seeds;
    }

    private List<Place> optimizeRoute(List<Place> cluster, BiFunction<Place, Place, RouteResult> routeProvider) {
        List<Place> unvisited = new ArrayList<>(cluster);
        List<Place> route = new ArrayList<>();

        // Seed is the first place
        Place current = unvisited.remove(0);
        route.add(current);

        while (!unvisited.isEmpty()) {
            Place nearest = null;
            double minDist = Double.MAX_VALUE;
            for (Place candidate : unvisited) {
                double dist = getRouteDistance(current, candidate, routeProvider);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = candidate;
                }
            }
            if (nearest != null) {
                route.add(nearest);
                unvisited.remove(nearest);
                current = nearest;
            } else {
                break;
            }
        }

        return route;
    }

    private List<ItineraryItemPlan> scheduleRoute(List<Place> route, BiFunction<Place, Place, RouteResult> routeProvider) {
        List<ItineraryItemPlan> items = new ArrayList<>();
        int count = route.size();

        for (int i = 0; i < count; i++) {
            Place place = route.get(i);
            TimeSlot slot;
            LocalTime startTime;

            // Sequential assignment logic
            if (count == 1) {
                slot = TimeSlot.MORNING;
                startTime = MORNING_START;
            } else if (count == 2) {
                if (i == 0) {
                    slot = TimeSlot.MORNING;
                    startTime = MORNING_START;
                } else {
                    slot = TimeSlot.AFTERNOON;
                    startTime = AFTERNOON_START;
                }
            } else if (count == 3) {
                if (i == 0) {
                    slot = TimeSlot.MORNING;
                    startTime = MORNING_START;
                } else if (i == 1) {
                    slot = TimeSlot.AFTERNOON;
                    startTime = AFTERNOON_START;
                } else {
                    slot = TimeSlot.EVENING;
                    startTime = EVENING_START;
                }
            } else { // 4 or more places
                if (i == 0) {
                    slot = TimeSlot.MORNING;
                    startTime = MORNING_START;
                } else if (i == 1) {
                    slot = TimeSlot.MORNING;
                    LocalTime prevEndTime = items.get(0).getEndTime();
                    startTime = prevEndTime.plusMinutes(TRANSIT_BUFFER_MINUTES);
                } else if (i == 2) {
                    slot = TimeSlot.AFTERNOON;
                    startTime = AFTERNOON_START;
                } else { // i >= 3
                    slot = TimeSlot.EVENING;
                    if (i == 3) {
                        startTime = EVENING_START;
                    } else {
                        LocalTime prevEndTime = items.get(i - 1).getEndTime();
                        startTime = prevEndTime.plusMinutes(TRANSIT_BUFFER_MINUTES);
                    }
                }
            }

            int duration = place.getDurationMinutes() != null ? place.getDurationMinutes() : 60;
            LocalTime endTime = startTime.plusMinutes(duration);
            int distanceFromPreviousMeters = 0;
            int durationFromPreviousSeconds = 0;
            if (i > 0) {
                RouteResult routeResult = routeProvider.apply(route.get(i - 1), place);
                distanceFromPreviousMeters = (int) Math.round(routeResult.distanceMeters());
                durationFromPreviousSeconds = (int) Math.round(routeResult.durationSeconds());
            }
            items.add(new ItineraryItemPlan(
                    place,
                    slot,
                    startTime,
                    endTime,
                    distanceFromPreviousMeters,
                    durationFromPreviousSeconds
            ));
        }

        return items;
    }

    private double getRouteDistance(Place origin, Place destination, BiFunction<Place, Place, RouteResult> routeProvider) {
        return routeProvider.apply(origin, destination).distanceMeters();
    }

    private RouteResult buildStraightLineRoute(Place origin, Place destination) {
        return new RouteResult(calculateDistance(origin, destination), 0.0, null);
    }

    private double calculateDistance(Place p1, Place p2) {
        if (p1.getLocation() == null || p2.getLocation() == null) {
            return 0.0;
        }
        return calculateHaversineDistance(
                p1.getLocation().getY(), p1.getLocation().getX(),
                p2.getLocation().getY(), p2.getLocation().getX()
        );
    }

    private double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return 6371000 * c; // in meters
    }
}
