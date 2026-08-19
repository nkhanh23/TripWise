import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { FilmGrainOverlay } from "@/components/motion/FilmGrainOverlay";
import { KineticTitle } from "@/components/motion/KineticTitle";

export function UnauthorizedPage() {
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
          <Button onClick={() => navigate("/login")} variant="primary">
            Đăng nhập
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
              display: "flex",
              flexDirection: "column",
              gap: 24
            }}
          >
            {/* Badge row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  backgroundColor: "#FFD166",
                  color: "#111111",
                  border: "2px solid #111111",
                  borderRadius: 6,
                  padding: "2px 10px",
                  textTransform: "uppercase",
                  transform: "skewX(-3deg)",
                  boxShadow: "2px 2px 0 #111111",
                  letterSpacing: "0.07em"
                }}
              >
                Mã lỗi 401
              </span>
              <span style={{ fontSize: 11, fontWeight: 900, color: "#7A6A58", letterSpacing: "0.06em" }}>
                UNAUTHORIZED
              </span>
            </div>

            {/* Two-column grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 32,
                alignItems: "center"
              }}
            >
              {/* Visual — Passport stamp illustration */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div
                  style={{
                    width: "100%",
                    maxWidth: 260,
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
                      opacity: 0.05,
                      backgroundImage: "radial-gradient(#111 2px, transparent 2px)",
                      backgroundSize: "20px 20px"
                    }}
                  />

                  {/* Rotated dashed stamp circle */}
                  <div
                    style={{
                      width: 104,
                      height: 104,
                      border: "3.5px dashed #E6392E",
                      borderRadius: "50%",
                      color: "#E6392E",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      transform: "rotate(-15deg)",
                      fontWeight: 900,
                      fontSize: 10,
                      textAlign: "center",
                      gap: 4,
                      letterSpacing: "0.08em"
                    }}
                  >
                    <i className="material-symbols-outlined" style={{ fontSize: 28 }}>lock</i>
                    UNVERIFIED
                  </div>

                  {/* Sticker */}
                  <span
                    style={{
                      position: "absolute",
                      bottom: 10,
                      right: 10,
                      backgroundColor: "#E6392E",
                      color: "#FFFDF3",
                      border: "1.5px solid #111111",
                      borderRadius: 4,
                      padding: "1px 6px",
                      fontSize: 8,
                      fontWeight: 900,
                      textTransform: "uppercase",
                      transform: "rotate(-4deg)"
                    }}
                  >
                    Need Passport
                  </span>
                </div>
              </div>

              {/* Text content */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <KineticTitle
                  size="card"
                  tag="h1"
                  text="Dừng lại! Bạn cần xuất trình hộ chiếu du lịch."
                  variant="pop"
                />

                <p style={{ fontSize: 14, color: "#7A6A58", fontWeight: 600, lineHeight: 1.65, margin: 0 }}>
                  Khu vực này yêu cầu xác thực tài khoản Explorer. Hành trình cá nhân, địa
                  điểm đã lưu và preferences chỉ có thể truy cập sau khi đăng nhập thành công.
                </p>

                <p
                  style={{
                    fontSize: 11,
                    color: "#7A6A58",
                    fontWeight: 800,
                    margin: 0,
                    paddingLeft: 12,
                    borderLeft: "3px solid #FFD166"
                  }}
                >
                  Bạn vẫn có thể xem Landing Page công khai và tạo thử lịch trình demo mà không cần tài khoản.
                </p>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
                  <Button onClick={() => navigate("/login")} variant="primary">
                    Đăng nhập ngay
                  </Button>
                  <Button onClick={() => navigate("/register")} variant="secondary">
                    Tạo tài khoản
                  </Button>
                  <Button onClick={() => navigate("/")} variant="ghost">
                    Về trang chủ
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
              Bắt đầu chuyến khám phá tiếp theo
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
              { icon: "login", label: "Đăng nhập", desc: "Truy cập tài khoản của bạn", to: "/login" },
              { icon: "person_add", label: "Tạo tài khoản", desc: "Đăng ký Explorer miễn phí", to: "/register" },
              { icon: "flight_takeoff", label: "Tạo trip demo", desc: "Không cần tài khoản", to: "/planner" }
            ].map((item) => (
              <Link key={item.to} to={item.to} style={{ textDecoration: "none" }}>
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
                  <i className="material-symbols-outlined" style={{ fontSize: 24, color: "#20A7D8" }}>
                    {item.icon}
                  </i>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#111111" }}>{item.label}</span>
                  <span style={{ fontSize: 11, color: "#7A6A58", fontWeight: 600 }}>{item.desc}</span>
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
          <Link to="/" style={{ color: "#7A6A58", textDecoration: "none" }}>Điều khoản</Link>
          <Link to="/" style={{ color: "#7A6A58", textDecoration: "none" }}>Bảo mật</Link>
          <Link to="/" style={{ color: "#7A6A58", textDecoration: "none" }}>Liên hệ</Link>
        </div>
      </footer>
    </div>
  );
}
