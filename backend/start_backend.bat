@echo off
cd /d C:\Users\PC\Documents\TripWise\backend
set SPRING_PROFILES_ACTIVE=local
set TRIPWISE_PLACE_IMPORT_ENABLED=false
call mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local > backend_console.log 2>&1
