#!/bin/bash
set -e
TARGET_DIR="$1"

echo "[INFO] Generating Beauty Booking Site at $TARGET_DIR..."

# Create Index Page
cat << 'INDEX' > "$TARGET_DIR/index.html"
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>極致美學 - 美容預約系統</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <nav id="main-nav">
        <div class="logo">Extreme Beauty</div>
        <ul>
            <li><a href="index.html">首頁</a></li>
            <li><a href="booking.html" id="nav-booking">在線預約</a></li>
        </ul>
    </nav>
    <header class="hero">
        <h1>專業美容美髮服務</h1>
        <p>為您打造專屬的自信美麗</p>
        <button onclick="location.href='booking.html'" class="btn-primary" id="hero-book-btn">立即預約</button>
    </header>
    <section class="services">
        <div class="service-card" data-ui="service-item">
            <h3>剪髮設計</h3>
            <p>$800 up</p>
        </div>
        <div class="service-card" data-ui="service-item">
            <h3>美甲彩繪</h3>
            <p>$1200 up</p>
        </div>
    </section>
</body>
</html>
INDEX

# Create Booking Page
cat << 'BOOKING' > "$TARGET_DIR/booking.html"
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <title>預約服務 - 極致美學</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="container">
        <h2>預約您的時段</h2>
        <form id="booking-form">
            <div class="form-group">
                <label for="service-select">選擇服務</label>
                <select id="service-select" required>
                    <option value="hair">剪髮</option>
                    <option value="nail">美甲</option>
                    <option value="facial">做臉</option>
                </select>
            </div>
            <div class="form-group">
                <label for="booking-date">選擇日期</label>
                <input type="date" id="booking-date" required>
            </div>
            <div class="form-group">
                <label for="booking-time">選擇時間</label>
                <input type="time" id="booking-time" required>
            </div>
            <button type="submit" id="submit-booking">確認預約</button>
        </form>
        <div id="success-msg" style="display:none;">預約成功！我們將儘速與您聯繫。</div>
    </div>
    <script src="js/main.js"></script>
</body>
</html>
BOOKING

# Create CSS
cat << 'CSS' > "$TARGET_DIR/css/style.css"
body { font-family: 'Helvetica Neue', sans-serif; margin: 0; color: #333; }
.hero { background: #f8f9fa; padding: 100px 20px; text-align: center; }
.btn-primary { background: #d4a373; color: white; padding: 12px 24px; border: none; cursor: pointer; }
.form-group { margin-bottom: 15px; }
#booking-form { max-width: 400px; margin: auto; padding: 20px; border: 1px solid #ddd; }
CSS

# Create JS
cat << 'JS' > "$TARGET_DIR/js/main.js"
document.getElementById('booking-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    document.getElementById('booking-form').style.display = 'none';
    document.getElementById('success-msg').style.display = 'block';
});
JS

echo "[SUCCESS] Site generation complete."
