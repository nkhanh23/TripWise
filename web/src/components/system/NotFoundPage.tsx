import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { FilmGrainOverlay } from "@/components/motion/FilmGrainOverlay";
import { KineticTitle } from "@/components/motion/KineticTitle";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#F7E7C6",
        overflowY: "auto",
        fontFamily: "'Outfit', 'Inter', sans-serif"
      }}
    >
      <FilmGrainOverlay />

      {/* ── Top Header ── */}
      <header
        style={{
          width: "100%",
          maxWidth: 1080,
          margin: "0 auto",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxSizing: "border-box",
          zIndex: 40
        }}
      >
        <Link
          to="/"
          style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}
        >
          <i
            className="material-symbols-outlined"
            style={{ color: "#20A7D8", fontSize: 32, fontWeight: 700 }}
          >
            explore
          </i>
          <span
            style={{
              fontFamily: "var(--font-display, 'Outfit', sans-serif)",
              fontSize: 26,
              color: "#20A7D8",
              textShadow: "2px 2px 0 #111111",
              fontWeight: 900
            }}
          >
            TripWise
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link
            to="/"
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#111111",
              textDecoration: "none",
              borderBottom: "2px dashed #111111",
              paddingBottom: 2
            }}
          >
            Về trang chủ
          </Link>
          <Button onClick={() => navigate("/planner")} variant="secondary">
            Tạo trip mới
          </Button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 1080,
          margin: "0 auto",
          padding: "40px 24px 64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box"
        }}
      >
        <div style={{ width: "100%", maxWidth: 800 }}>

          {/* ── Error Card ── */}
          <div
            style={{
              backgroundColor: "#FFFDF3",
              border: "3px solid #111111",
              borderRadius: 12,
              boxShadow: "6px 6px 0px 0px rgba(0,0,0,1)",
              padding: "32px 28px",
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 32
            }}
          >
            {/* Badge row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  backgroundColor: "#E6392E",
                  color: "#FFFDF3",
                  border: "2px solid #111111",
                  borderRadius: 6,
                  padding: "2px 10px",
                  textTransform: "uppercase",
                  transform: "skewX(-3deg)",
                  boxShadow: "2px 2px 0 #111111",
                  letterSpacing: "0.07em"
                }}
              >
                Mã lỗi 404
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  color: "#E6392E",
                  letterSpacing: "0.06em"
                }}
              >
                LOST WAYFARER
              </span>
            </div>

            {/* Two-column layout on wider screens */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 32,
                alignItems: "center"
              }}
            >
              {/* Visual illustration */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div
                  style={{
                    width: "100%",
                    maxWidth: 280,
                    height: 180,
                    backgroundColor: "#FFF6DE",
                    border: "3px solid #111111",
                    borderRadius: 16,
                    boxShadow: "4px 4px 0 #111111",
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  {/* Dot-grid background */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: 0.1,
                      backgroundImage: "radial-gradient(#111 1.5px, transparent 1.5px)",
                      backgroundSize: "15px 15px"
                    }}
                  />

                  {/* Dashed route path SVG */}
                  <svg
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      pointerEvents: "none"
                    }}
                  >
                    <path
                      d="M 20 150 Q 80 80 140 100 T 240 38"
                      fill="none"
                      stroke="#111111"
                      strokeDasharray="6,6"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M 20 150 Q 80 80 140 100 T 240 38"
                      fill="none"
                      stroke="#E6392E"
                      strokeDasharray="5,5"
                      strokeWidth="1.5"
                    />
                  </svg>

                  {/* Start marker (green dot) */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 22,
                      left: 18,
                      width: 14,
                      height: 14,
                      border: "2.5px solid #111111",
                      backgroundColor: "#B8F24A",
                      borderRadius: "50%"
                    }}
                  />

                  {/* Animated question-mark end marker */}
                  <div
                    style={{
                      position: "absolute",
                      top: 20,
                      right: 18,
                      backgroundColor: "#E6392E",
                      border: "2px solid #111111",
                      boxShadow: "2px 2px 0 #111111",
                      borderRadius: "50%",
                      width: 34,
                      height: 34,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#FFFDF3",
                      fontWeight: 900,
                      fontSize: 20,
                      animation: "bounce 1.2s infinite"
                    }}
                  >
                    ?
                  </div>

                  {/* Wrong Turn sticker */}
                  <span
                    style={{
                      position: "absolute",
                      bottom: 10,
                      right: 10,
                      backgroundColor: "#FFD166",
                      border: "1.5px solid #111111",
                      borderRadius: 4,
                      padding: "1px 6px",
                      fontSize: 8,
                      fontWeight: 900,
                      textTransform: "uppercase",
                      transform: "rotate(-4deg)"
                    }}
                  >
                    Wrong Turn
                  </span>
                </div>
              </div>

              {/* Text content */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <KineticTitle
                  size="card"
                  tag="h1"
                  text="Lộ trình này chưa được Gemini khai phá!"
                  variant="pop"
                />

                <p
                  style={{
                    fontSize: 14,
                    color: "#7A6A58",
                    fontWeight: 600,
                    lineHeight: 1.65,
                    margin: 0
                  }}
                >
                  Có vẻ như bạn đã đi lạc sang một múi giờ khác... Trang bạn đang tìm kiếm
                  có thể đã đổi địa chỉ, bị xóa tạm thời hoặc chưa từng tồn tại trên bản
                  đồ hành trình của TripWise.
                </p>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
                  <Button onClick={() => navigate("/")} variant="primary">
                    Về trang chủ
                  </Button>
                  <Button onClick={() => navigate("/dashboard")} variant="secondary">
                    Mở Dashboard
                  </Button>
                  <Button onClick={() => navigate("/explore")} variant="ghost">
                    Khám phá địa điểm
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Suggestion strip ── */}
          <div
            style={{
              marginTop: 40,
              borderBottom: "2.5px solid #111111",
              paddingBottom: 8,
              marginBottom: 20
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display, 'Outfit', sans-serif)",
                fontSize: 18,
                color: "#111111",
                margin: 0,
                fontWeight: 900
              }}
            >
              Có thể bạn đang muốn tìm...
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16
            }}
          >
            {[
              {
                icon: "flight_takeoff",
                label: "Lập lịch trình mới",
                desc: "Tạo hành trình AI ngay bây giờ",
                to: "/planner"
              },
              {
                icon: "explore",
                label: "Khám phá địa điểm",
                desc: "Tìm kiếm POI trên bản đồ",
                to: "/explore"
              },
              {
                icon: "dashboard",
                label: "Dashboard của tôi",
                desc: "Xem các chuyến đi đã lưu",
                to: "/dashboard"
              }
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    backgroundColor: "#FFFDF3",
                    border: "2px solid #111111",
                    borderRadius: 8,
                    boxShadow: "3px 3px 0 #111111",
                    padding: "16px 18px",
                    cursor: "pointer",
                    transition: "transform 0.15s, box-shadow 0.15s",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translate(-2px,-2px)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "5px 5px 0 #111111";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translate(0,0)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "3px 3px 0 #111111";
                  }}
                >
                  <i
                    className="material-symbols-outlined"
                    style={{ fontSize: 24, color: "#20A7D8" }}
                  >
                    {item.icon}
                  </i>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#111111" }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: 11, color: "#7A6A58", fontWeight: 600 }}>
                    {item.desc}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer
        style={{
          width: "100%",
          maxWidth: 1080,
          margin: "0 auto",
          padding: "16px 24px",
          borderTop: "2px dashed #D8B98A",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxSizing: "border-box",
          fontSize: 11,
          fontWeight: 700,
          color: "#7A6A58",
          flexWrap: "wrap",
          gap: 8
        }}
      >
        <div>© 2026 TripWise. Hệ thống phản hồi mã lỗi.</div>
        <div style={{ display: "flex", gap: 16 }}>
          <Link to="/" style={{ color: "#7A6A58", textDecoration: "none" }}>
            Điều khoản
          </Link>
          <Link to="/" style={{ color: "#7A6A58", textDecoration: "none" }}>
            Bảo mật
          </Link>
          <Link to="/" style={{ color: "#7A6A58", textDecoration: "none" }}>
            Liên hệ
          </Link>
        </div>
      </footer>
    </div>
  );
}
