# 47 — WordPress 深度指南（接案實戰版）

> 給網頁設計接案者的 WordPress 完整手冊
> 涵蓋主機選擇、主題開發、頁面建構器、ACF、REST API、安全、效能、WooCommerce
> 最後更新：2026-03-05

---

## 目錄

1. [主機選擇](#一主機選擇)
2. [安裝與初始設定 SOP](#二安裝與初始設定-sop)
3. [主題開發基礎](#三主題開發基礎)
4. [頁面建構器](#四頁面建構器elementorbricks)
5. [ACF 自訂欄位](#五acf-自訂欄位)
6. [Custom Post Type + Taxonomy](#六custom-post-type--taxonomy)
7. [WP REST API](#七wp-rest-api)
8. [外掛推薦清單](#八外掛推薦清單)
9. [安全加固](#九安全加固)
10. [效能優化](#十效能優化)
11. [備份與搬家](#十一備份與搬家)
12. [常見問題 20 題](#十二常見問題-20-題)
13. [WooCommerce 快速設定](#十三woocommerce-快速設定)
14. [WordPress Multisite](#十四wordpress-multisite)
15. [WP-CLI 指令速查](#十五wp-cli-指令速查)

---

## 一、主機選擇

### 五大主機比較表

| 項目 | Cloudways | SiteGround | Bluehost | Kinsta | 自建 VPS |
|------|-----------|------------|----------|--------|----------|
| **月費（起）** | US$14 | US$2.99 | US$2.95 | US$35 | US$5-12 |
| **主機類型** | 託管雲端 | 共享/雲端 | 共享 | 託管 WP | 自管 |
| **伺服器選擇** | DO/Vultr/AWS/GCP | 自有機房 | 自有機房 | GCP | 任選 |
| **免費 SSL** | Let's Encrypt | 有 | 有 | 有 | 自裝 |
| **自動備份** | 每日 | 每日 | 付費 | 每日 | 自建 |
| **SSH 存取** | 有 | 有（限制） | 無 | 有（限制） | 完整 |
| **暫存環境** | 有 | 有 | 無 | 有 | 自建 |
| **CDN** | Cloudflare 整合 | 內建 | 付費 | 內建 | 自建 |
| **WP-CLI** | 有 | 有 | 無 | 有 | 自裝 |
| **適合對象** | 中大型接案 | 初學/小案 | 極低預算 | 高流量 | 技術控 |
| **台灣連線速度** | 佳（選東京） | 普通 | 慢 | 佳 | 看機房 |

### 推薦策略

```
接案量 < 5 個站  → SiteGround GrowBig（可放多站、有暫存）
接案量 5-20 站   → Cloudways Vultr 2GB（彈性大、可隨時升級）
高流量電商站     → Kinsta（Google CDN + 自動擴展）
技術能力足夠     → Vultr/Linode VPS + RunCloud 面板
客戶自己管       → SiteGround（後台友善、客戶能自己操作）
```

### Cloudways 開機範例

```
1. 註冊 Cloudways → 選 Vultr High Frequency
2. 選機房：Tokyo（對台灣延遲最低 ~30ms）
3. 規格：2GB RAM / 1 vCPU（可放 3-5 個小站）
4. Application：WordPress 6.x（自動裝好）
5. 進後台 → Application → SSL → 啟用 Let's Encrypt
6. Server → Settings → PHP 8.2 + OPcache 啟用
```

### 自建 VPS 快速搭建（進階）

```bash
# Ubuntu 22.04 + RunCloud 面板（推薦，省時間）
# 1. 開 Vultr/Linode VPS（Tokyo / 2GB RAM）
# 2. 註冊 RunCloud → 加入 Server → 貼 SSH 連線資訊
# 3. RunCloud 自動裝好 Nginx + PHP + MariaDB

# 如果要全手動：
sudo apt update && sudo apt upgrade -y

# 安裝 Nginx + PHP 8.2 + MariaDB
sudo apt install -y nginx mariadb-server \
  php8.2-fpm php8.2-mysql php8.2-xml php8.2-mbstring \
  php8.2-curl php8.2-zip php8.2-gd php8.2-intl \
  php8.2-imagick php8.2-redis

# 設定 MariaDB
sudo mysql_secure_installation
sudo mysql -e "CREATE DATABASE wordpress_db;"
sudo mysql -e "CREATE USER 'wp_user'@'localhost' IDENTIFIED BY '強密碼';"
sudo mysql -e "GRANT ALL ON wordpress_db.* TO 'wp_user'@'localhost';"

# 下載 WordPress
cd /var/www
sudo wget https://wordpress.org/latest.tar.gz
sudo tar -xzf latest.tar.gz
sudo chown -R www-data:www-data wordpress
```

### Nginx 設定檔範例

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    root /var/www/wordpress;
    index index.php;

    # 安全 Header
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 限制上傳大小
    client_max_body_size 64M;

    # 靜態檔案快取
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # WordPress 永久連結
    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    # PHP 處理
    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 300;
    }

    # 禁止存取敏感檔案
    location ~ /\.(ht|git|env) { deny all; }
    location ~* /wp-config\.php$ { deny all; }
    location ~* /readme\.html$ { deny all; }
    location ~* /license\.txt$ { deny all; }
}
```

---

## 二、安裝與初始設定 SOP

### 30 分鐘從零到能用

```
00-05 分 → 主機開通 + DNS 指向
05-10 分 → WordPress 安裝 + SSL
10-15 分 → 基本設定（語系/時區/永久連結）
15-20 分 → 安裝必要外掛
20-25 分 → 安裝主題 + 匯入 Demo
25-30 分 → 安全加固 + 備份設定
```

### 步驟 1：WP-CLI 安裝（推薦）

```bash
# 安裝 WP-CLI
curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
chmod +x wp-cli.phar
sudo mv wp-cli.phar /usr/local/bin/wp

# 下載 WordPress
wp core download --locale=zh_TW

# 建立設定檔
wp config create \
  --dbname=wordpress_db \
  --dbuser=wp_user \
  --dbpass='強密碼' \
  --dbhost=localhost \
  --dbprefix=wp_ \
  --locale=zh_TW

# 執行安裝
wp core install \
  --url="https://example.com" \
  --title="網站名稱" \
  --admin_user=admin_laocai \
  --admin_password='超強密碼!@#$' \
  --admin_email=admin@example.com
```

### 步驟 2：初始設定腳本

```bash
#!/bin/bash
# wp-init.sh — WordPress 初始設定自動化

# 時區與語系
wp option update timezone_string "Asia/Taipei"
wp option update date_format "Y-m-d"
wp option update time_format "H:i"
wp language core install zh_TW
wp site switch-language zh_TW

# 永久連結（SEO 友善）
wp rewrite structure '/%postname%/'
wp rewrite flush

# 刪除預設內容
wp post delete 1 --force   # Hello World
wp post delete 2 --force   # 範例頁面
wp comment delete 1 --force

# 關閉 Pingback
wp option update default_pingback_flag 0
wp option update default_ping_status closed
wp option update default_comment_status closed

# 安全設定
wp config set DISALLOW_FILE_EDIT true --raw
wp config set WP_MEMORY_LIMIT '256M'
wp config set WP_MAX_MEMORY_LIMIT '512M'
wp config set WP_AUTO_UPDATE_CORE false --raw

# 移除不需要的預設外掛
wp plugin delete hello akismet

# 設定首頁為靜態頁面
wp post create --post_type=page --post_title='首頁' --post_status=publish
wp post create --post_type=page --post_title='部落格' --post_status=publish
HOMEPAGE_ID=$(wp post list --post_type=page --field=ID --name=首頁)
BLOG_ID=$(wp post list --post_type=page --field=ID --name=部落格)
wp option update show_on_front page
wp option update page_on_front $HOMEPAGE_ID
wp option update page_for_posts $BLOG_ID

echo "初始設定完成！"
```

### 步驟 3：必裝外掛一鍵安裝

```bash
wp plugin install wordfence --activate          # 安全
wp plugin install wordpress-seo --activate      # SEO (Yoast)
wp plugin install w3-total-cache --activate     # 快取
wp plugin install updraftplus --activate        # 備份
wp plugin install wpforms-lite --activate       # 表單
wp plugin install imagify --activate            # 圖片優化
wp plugin install code-snippets --activate      # 程式碼片段
wp plugin install redirection --activate        # 301 轉址
```

---

## 三、主題開發基礎

### Template Hierarchy（模板層級）

```
首頁:      front-page.php → home.php → index.php
文章:      single-{post_type}.php → single.php → singular.php → index.php
頁面:      page-{slug}.php → page-{id}.php → page.php → singular.php → index.php
分類:      category-{slug}.php → category-{id}.php → category.php → archive.php → index.php
標籤:      tag-{slug}.php → tag.php → archive.php → index.php
自訂分類:  taxonomy-{tax}-{term}.php → taxonomy-{tax}.php → taxonomy.php → archive.php
自訂類型:  archive-{post_type}.php → archive.php → index.php
搜尋結果:  search.php → index.php
404:       404.php → index.php
```

### Block Theme 目錄結構（FSE 全站編輯，2024+ 趨勢）

```
theme/
├── style.css              # 主題宣告
├── theme.json             # 全域樣式設定（核心）
├── functions.php          # PHP 功能
├── templates/             # 頁面模板（HTML）
│   ├── index.html
│   ├── single.html
│   ├── page.html
│   ├── archive.html
│   ├── search.html
│   └── 404.html
├── parts/                 # 可重用區塊
│   ├── header.html
│   ├── footer.html
│   └── sidebar.html
└── patterns/              # Block Pattern
    ├── hero.php
    └── cta.php
```

### theme.json 完整範例

```json
{
  "$schema": "https://schemas.wp.org/wp/6.5/theme.json",
  "version": 3,
  "settings": {
    "appearanceTools": true,
    "color": {
      "palette": [
        { "slug": "primary", "color": "#1e40af", "name": "主色" },
        { "slug": "secondary", "color": "#9333ea", "name": "次色" },
        { "slug": "accent", "color": "#f59e0b", "name": "強調色" },
        { "slug": "dark", "color": "#1f2937", "name": "深色" },
        { "slug": "light", "color": "#f9fafb", "name": "淺色" }
      ],
      "defaultPalette": false,
      "defaultGradients": false
    },
    "typography": {
      "fontFamilies": [
        {
          "fontFamily": "'Noto Sans TC', sans-serif",
          "slug": "noto-sans-tc",
          "name": "Noto Sans TC",
          "fontFace": [
            {
              "fontFamily": "Noto Sans TC",
              "fontWeight": "400",
              "fontStyle": "normal",
              "src": ["file:./assets/fonts/NotoSansTC-Regular.woff2"]
            },
            {
              "fontFamily": "Noto Sans TC",
              "fontWeight": "700",
              "fontStyle": "normal",
              "src": ["file:./assets/fonts/NotoSansTC-Bold.woff2"]
            }
          ]
        }
      ],
      "fontSizes": [
        { "slug": "small", "size": "0.875rem", "name": "小" },
        { "slug": "medium", "size": "1rem", "name": "中" },
        { "slug": "large", "size": "1.25rem", "name": "大" },
        { "slug": "x-large", "size": "1.5rem", "name": "特大" },
        { "slug": "xx-large", "size": "2.25rem", "name": "標題" }
      ],
      "fluid": true
    },
    "spacing": {
      "units": ["px", "rem", "%", "vw"],
      "spacingSizes": [
        { "slug": "10", "size": "0.5rem", "name": "極小" },
        { "slug": "20", "size": "1rem", "name": "小" },
        { "slug": "30", "size": "1.5rem", "name": "中" },
        { "slug": "40", "size": "2rem", "name": "大" },
        { "slug": "50", "size": "3rem", "name": "特大" }
      ]
    },
    "layout": {
      "contentSize": "800px",
      "wideSize": "1200px"
    }
  },
  "styles": {
    "color": {
      "background": "var(--wp--preset--color--light)",
      "text": "var(--wp--preset--color--dark)"
    },
    "typography": {
      "fontFamily": "var(--wp--preset--font-family--noto-sans-tc)",
      "fontSize": "var(--wp--preset--font-size--medium)",
      "lineHeight": "1.8"
    },
    "elements": {
      "h1": { "typography": { "fontSize": "var(--wp--preset--font-size--xx-large)" } },
      "h2": { "typography": { "fontSize": "var(--wp--preset--font-size--x-large)" } },
      "link": {
        "color": { "text": "var(--wp--preset--color--primary)" },
        ":hover": { "color": { "text": "var(--wp--preset--color--secondary)" } }
      },
      "button": {
        "color": {
          "background": "var(--wp--preset--color--primary)",
          "text": "#ffffff"
        },
        "border": { "radius": "8px" }
      }
    }
  },
  "templateParts": [
    { "name": "header", "title": "Header", "area": "header" },
    { "name": "footer", "title": "Footer", "area": "footer" }
  ]
}
```

### functions.php 接案常用功能

```php
<?php
// ========== 基礎設定 ==========
function mytheme_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_image_size('hero', 1920, 800, true);
    add_image_size('card', 600, 400, true);
    add_image_size('thumbnail-sm', 300, 200, true);

    register_nav_menus([
        'primary' => '主選單',
        'footer'  => '頁尾選單',
        'mobile'  => '手機選單',
    ]);

    add_theme_support('html5', [
        'search-form', 'comment-form', 'comment-list',
        'gallery', 'caption', 'style', 'script'
    ]);
    add_theme_support('align-wide');
    add_theme_support('wp-block-styles');
    add_theme_support('editor-styles');
    add_editor_style('assets/css/editor.css');
}
add_action('after_setup_theme', 'mytheme_setup');

// ========== 載入資源 ==========
function mytheme_scripts() {
    $ver = wp_get_theme()->get('Version');
    wp_enqueue_style('mytheme-style', get_stylesheet_uri(), [], $ver);
    wp_enqueue_style('mytheme-custom',
        get_template_directory_uri() . '/assets/css/custom.css', [], $ver);
    wp_enqueue_script('mytheme-main',
        get_template_directory_uri() . '/assets/js/main.js',
        [], $ver, ['strategy' => 'defer']);

    // 移除不需要的預設資源
    wp_dequeue_style('wp-block-library');
    wp_dequeue_style('classic-theme-styles');
}
add_action('wp_enqueue_scripts', 'mytheme_scripts');

// ========== 效能與安全 ==========
remove_action('wp_head', 'wp_generator');
remove_action('wp_head', 'wlwmanifest_link');
remove_action('wp_head', 'rsd_link');
remove_action('wp_head', 'wp_shortlink_wp_head');
remove_action('wp_head', 'rest_output_link_wp_head');
add_filter('xmlrpc_enabled', '__return_false');

// 停用 Emoji
function disable_emojis() {
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('wp_print_styles', 'print_emoji_styles');
}
add_action('init', 'disable_emojis');

// ========== 自訂功能 ==========
// Excerpt 長度
add_filter('excerpt_length', function() { return 30; });
add_filter('excerpt_more', function() { return '...'; });

// 允許 SVG 上傳
add_filter('upload_mimes', function($mimes) {
    $mimes['svg'] = 'image/svg+xml';
    return $mimes;
});

// 自訂登入頁 Logo
function mytheme_login_logo() {
    echo '<style>
        #login h1 a {
            background-image: url(' . esc_url(get_template_directory_uri()) . '/assets/img/logo.png);
            background-size: contain;
            width: 200px; height: 80px;
        }
    </style>';
}
add_action('login_enqueue_scripts', 'mytheme_login_logo');

// 管理後台 Footer 文字
add_filter('admin_footer_text', function() {
    return '由 <a href="#">你的工作室</a> 開發維護';
});

// ========== Widget Area ==========
function mytheme_widgets_init() {
    register_sidebar([
        'name' => '側邊欄', 'id' => 'sidebar-1',
        'before_widget' => '<div class="widget %2$s">',
        'after_widget' => '</div>',
        'before_title' => '<h3 class="widget-title">',
        'after_title' => '</h3>',
    ]);
}
add_action('widgets_init', 'mytheme_widgets_init');
```

---

## 四、頁面建構器（Elementor/Bricks）

### 什麼時候用頁面建構器？

```
用建構器:
  - 客戶要自己改內容（非技術人員）
  - 設計變化大、每頁不同版面
  - 快速交付（1-2 週要上線）
  - Landing Page / 形象網站

不用建構器:
  - 高效能需求（< 1 秒載入）
  - 大量重複版面（用 ACF + 模板更好）
  - 客製化程度極高（寫 code 更快）
  - 部落格 / 內容為主的網站
```

### Elementor vs Bricks 比較

| 項目 | Elementor Pro | Bricks |
|------|-------------|--------|
| **價格** | US$59/年（1站） | US$79 永久（無限站） |
| **效能** | 中等（DOM 較多） | 優秀（乾淨輸出） |
| **學習曲線** | 低 | 中 |
| **模板生態** | 極豐富 | 成長中 |
| **自訂 CSS/JS** | 有 | 有（更好） |
| **動態資料** | 有 | 有（原生更強） |
| **Query Loop** | 有 | 有（更靈活） |
| **WooCommerce** | 內建 Builder | 內建 Builder |
| **推薦** | 客戶自管/快速交付 | 接案者自用/效能優先 |

### Elementor 效能最佳實踐

```
1. 減少巢狀層級 — Section > Column > Widget，最多 3 層
2. 停用不用的 Widget — Elementor > Settings > Features
3. 用 Flexbox Container（取代舊 Section）
4. 圖片用 Lazy Load（Elementor 內建）
5. 停用 Google Fonts（用 theme.json 載入本地字體）
6. CSS Print Method 選 External File（不要 Inline）
7. 改善 DOM — 用 Container + Flex 減少 div 層數

# Elementor 效能設定路徑
Elementor > Settings > Performance:
  - CSS Print Method: External File
  - Improved Asset Loading: Enable
  - Lazy Load Background Images: Enable
```

### Bricks Builder 接案工作流

```
1. 建立 Template Conditions（哪個模板套哪些頁面）
2. 用 Dynamic Data 綁定 ACF 欄位
3. 善用 Query Loop（取代寫 WP_Query PHP）
4. 用 Interaction（取代寫 JS 動畫）
5. 客戶培訓只教 WordPress 原生編輯器（不教 Bricks 後台）

# Bricks 動態資料語法
{post_title}
{post_content}
{acf_field_name}
{post_terms_category}
{featured_image}
{wp_custom_field_key}
```

---

## 五、ACF 自訂欄位

### 安裝與設定

```bash
# 安裝 ACF Pro（需授權碼）
wp plugin install advanced-custom-fields-pro --activate

# 或用免費版
wp plugin install advanced-custom-fields --activate
```

### 基本欄位取值

```php
<?php
// 取得單一欄位
$phone = get_field('phone');                      // 目前文章
$phone = get_field('phone', $post_id);            // 指定文章
$phone = get_field('phone', 'option');             // 選項頁面
$phone = get_field('phone', 'term_5');             // 分類
$phone = get_field('phone', 'user_1');             // 使用者

// 顯示欄位
the_field('phone');

// 圖片欄位（回傳格式設為 Array）
$image = get_field('hero_image');
if ($image) {
    echo '<img src="' . esc_url($image['sizes']['large']) . '"'
       . ' alt="' . esc_attr($image['alt']) . '"'
       . ' width="' . $image['sizes']['large-width'] . '"'
       . ' height="' . $image['sizes']['large-height'] . '">';
}

// 關聯欄位（Post Object）
$related = get_field('related_post');
if ($related) {
    echo '<a href="' . get_permalink($related->ID) . '">'
       . esc_html($related->post_title) . '</a>';
}

// True/False 欄位
if (get_field('show_banner')) {
    // 顯示 Banner
}

// Select / Radio 欄位
$color = get_field('theme_color');
echo '<div class="theme-' . esc_attr($color) . '">';
```

### Repeater（重複器）— ACF Pro

```php
<?php
// 情境：團隊成員列表
if (have_rows('team_members')) : ?>
<div class="team-grid">
    <?php while (have_rows('team_members')) : the_row();
        $name  = get_sub_field('name');
        $role  = get_sub_field('role');
        $photo = get_sub_field('photo');
        $bio   = get_sub_field('bio');
    ?>
    <div class="team-card">
        <?php if ($photo) : ?>
            <img src="<?php echo esc_url($photo['sizes']['card']); ?>"
                 alt="<?php echo esc_attr($name); ?>">
        <?php endif; ?>
        <h3><?php echo esc_html($name); ?></h3>
        <p class="role"><?php echo esc_html($role); ?></p>
        <p class="bio"><?php echo esc_html($bio); ?></p>
    </div>
    <?php endwhile; ?>
</div>
<?php endif; ?>
```

### Flexible Content（彈性內容）— 頁面區塊建構

```php
<?php
// 情境：用 ACF 做頁面區塊（取代頁面建構器）
if (have_rows('page_sections')) :
    while (have_rows('page_sections')) : the_row();
        $layout = get_row_layout();

        switch ($layout) {
            case 'hero_section':
                $title = get_sub_field('title');
                $bg    = get_sub_field('background_image');
                $cta   = get_sub_field('cta_button');
                ?>
                <section class="hero" style="background-image: url(<?php echo esc_url($bg['url']); ?>)">
                    <h1><?php echo esc_html($title); ?></h1>
                    <?php if ($cta) : ?>
                        <a href="<?php echo esc_url($cta['url']); ?>" class="btn">
                            <?php echo esc_html($cta['title']); ?>
                        </a>
                    <?php endif; ?>
                </section>
                <?php break;

            case 'features_grid':
                ?>
                <section class="features">
                    <?php if (have_rows('features')) :
                        while (have_rows('features')) : the_row(); ?>
                        <div class="feature-card">
                            <div class="icon"><?php the_sub_field('icon'); ?></div>
                            <h3><?php the_sub_field('title'); ?></h3>
                            <p><?php the_sub_field('description'); ?></p>
                        </div>
                    <?php endwhile; endif; ?>
                </section>
                <?php break;

            case 'testimonials':
                ?>
                <section class="testimonials">
                    <?php if (have_rows('quotes')) :
                        while (have_rows('quotes')) : the_row(); ?>
                        <blockquote>
                            <p><?php the_sub_field('quote'); ?></p>
                            <cite><?php the_sub_field('author'); ?></cite>
                        </blockquote>
                    <?php endwhile; endif; ?>
                </section>
                <?php break;

            case 'cta_banner':
                ?>
                <section class="cta-banner"
                    style="background-color: <?php the_sub_field('bg_color'); ?>">
                    <h2><?php the_sub_field('heading'); ?></h2>
                    <?php $link = get_sub_field('button');
                    if ($link) : ?>
                        <a href="<?php echo esc_url($link['url']); ?>" class="btn">
                            <?php echo esc_html($link['title']); ?>
                        </a>
                    <?php endif; ?>
                </section>
                <?php break;
        }
    endwhile;
endif;
?>
```

### ACF Options Page（全站設定頁）

```php
<?php
// 在 functions.php 註冊
if (function_exists('acf_add_options_page')) {
    acf_add_options_page([
        'page_title' => '網站設定',
        'menu_title' => '網站設定',
        'menu_slug'  => 'site-settings',
        'capability' => 'edit_posts',
        'icon_url'   => 'dashicons-admin-settings',
        'position'   => 2,
    ]);

    acf_add_options_sub_page([
        'page_title'  => '社群連結',
        'menu_title'  => '社群連結',
        'parent_slug' => 'site-settings',
    ]);

    acf_add_options_sub_page([
        'page_title'  => '頁尾設定',
        'menu_title'  => '頁尾設定',
        'parent_slug' => 'site-settings',
    ]);
}

// 模板中取值
$fb_url = get_field('facebook_url', 'option');
$ig_url = get_field('instagram_url', 'option');
$footer_text = get_field('footer_copyright', 'option');
?>
```

### ACF 用 PHP 註冊欄位群組（版本控管）

```php
<?php
// 比起 GUI，PHP 註冊可以 git 版本控管
acf_add_local_field_group([
    'key'    => 'group_company_info',
    'title'  => '公司資訊',
    'fields' => [
        [
            'key'   => 'field_company_name',
            'label' => '公司名稱',
            'name'  => 'company_name',
            'type'  => 'text',
        ],
        [
            'key'   => 'field_company_phone',
            'label' => '電話',
            'name'  => 'company_phone',
            'type'  => 'text',
        ],
        [
            'key'           => 'field_company_logo',
            'label'         => 'Logo',
            'name'          => 'company_logo',
            'type'          => 'image',
            'return_format' => 'array',
            'preview_size'  => 'thumbnail',
        ],
    ],
    'location' => [
        [[ 'param' => 'options_page', 'operator' => '==', 'value' => 'site-settings' ]],
    ],
]);
```

---

## 六、Custom Post Type + Taxonomy

### 用 PHP 註冊（推薦，可版本控管）

```php
<?php
// 註冊自訂文章類型：作品集
function register_portfolio_cpt() {
    register_post_type('portfolio', [
        'labels' => [
            'name'               => '作品集',
            'singular_name'      => '作品',
            'add_new'            => '新增作品',
            'add_new_item'       => '新增作品',
            'edit_item'          => '編輯作品',
            'view_item'          => '檢視作品',
            'all_items'          => '所有作品',
            'search_items'       => '搜尋作品',
            'not_found'          => '找不到作品',
            'menu_name'          => '作品集',
        ],
        'public'             => true,
        'has_archive'        => true,
        'rewrite'            => ['slug' => 'portfolio', 'with_front' => false],
        'menu_icon'          => 'dashicons-portfolio',
        'menu_position'      => 5,
        'supports'           => ['title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'],
        'show_in_rest'       => true,   // Block Editor + REST API
        'taxonomies'         => ['portfolio_category'],
        'capability_type'    => 'post',
        'publicly_queryable' => true,
    ]);
}
add_action('init', 'register_portfolio_cpt');

// 註冊自訂分類法：作品分類
function register_portfolio_taxonomy() {
    register_taxonomy('portfolio_category', 'portfolio', [
        'labels' => [
            'name'          => '作品分類',
            'singular_name' => '作品分類',
            'search_items'  => '搜尋分類',
            'all_items'     => '所有分類',
            'edit_item'     => '編輯分類',
            'add_new_item'  => '新增分類',
            'menu_name'     => '作品分類',
        ],
        'hierarchical'   => true,     // true = 像分類 / false = 像標籤
        'public'         => true,
        'show_in_rest'   => true,
        'rewrite'        => ['slug' => 'portfolio-cat'],
        'show_admin_column' => true,
    ]);
}
add_action('init', 'register_portfolio_taxonomy');

// 清除永久連結快取（註冊後要做一次）
// 去 設定 → 永久連結 → 點「儲存」即可
```

### 自訂文章類型的模板

```php
<?php
// archive-portfolio.php — 作品集列表頁
get_header(); ?>

<main class="portfolio-archive">
    <h1>作品集</h1>

    <?php
    // 分類篩選
    $terms = get_terms(['taxonomy' => 'portfolio_category', 'hide_empty' => true]);
    if ($terms) : ?>
    <div class="filter-bar">
        <button class="filter-btn active" data-filter="all">全部</button>
        <?php foreach ($terms as $term) : ?>
            <button class="filter-btn" data-filter="<?php echo esc_attr($term->slug); ?>">
                <?php echo esc_html($term->name); ?>
            </button>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>

    <div class="portfolio-grid">
        <?php while (have_posts()) : the_post();
            $cats = get_the_terms(get_the_ID(), 'portfolio_category');
            $cat_slugs = $cats ? implode(' ', wp_list_pluck($cats, 'slug')) : '';
        ?>
        <div class="portfolio-card" data-category="<?php echo esc_attr($cat_slugs); ?>">
            <?php if (has_post_thumbnail()) : ?>
                <a href="<?php the_permalink(); ?>">
                    <?php the_post_thumbnail('card'); ?>
                </a>
            <?php endif; ?>
            <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
            <p><?php the_excerpt(); ?></p>
        </div>
        <?php endwhile; ?>
    </div>

    <?php the_posts_pagination(); ?>
</main>

<?php get_footer(); ?>
```

### 用 WP_Query 自訂查詢

```php
<?php
// 取最新 6 個作品，只取「網頁設計」分類
$portfolio_query = new WP_Query([
    'post_type'      => 'portfolio',
    'posts_per_page' => 6,
    'orderby'        => 'date',
    'order'          => 'DESC',
    'tax_query'      => [
        [
            'taxonomy' => 'portfolio_category',
            'field'    => 'slug',
            'terms'    => 'web-design',
        ],
    ],
    'meta_query'     => [     // 可選：用 ACF 欄位篩選
        [
            'key'     => 'is_featured',
            'value'   => '1',
            'compare' => '=',
        ],
    ],
]);

if ($portfolio_query->have_posts()) :
    while ($portfolio_query->have_posts()) : $portfolio_query->the_post();
        // 輸出內容
    endwhile;
    wp_reset_postdata();  // 重要！恢復全域 $post
endif;
?>
```

---

## 七、WP REST API

### 內建端點速查

```
GET  /wp-json/wp/v2/posts          # 文章列表
GET  /wp-json/wp/v2/posts/{id}     # 單篇文章
GET  /wp-json/wp/v2/pages          # 頁面列表
GET  /wp-json/wp/v2/categories     # 分類
GET  /wp-json/wp/v2/tags           # 標籤
GET  /wp-json/wp/v2/media          # 媒體
GET  /wp-json/wp/v2/users          # 使用者
GET  /wp-json/wp/v2/{custom_type}  # 自訂文章類型

# 常用參數
?per_page=10                       # 每頁數量（最大 100）
?page=2                            # 頁碼
?search=關鍵字                      # 搜尋
?categories=5                      # 分類 ID
?orderby=date&order=desc           # 排序
?_fields=id,title,link             # 只取特定欄位（省流量）
?_embed                            # 嵌入關聯資料（作者、特色圖等）
?status=publish                    # 狀態篩選
```

### 用 curl 測試

```bash
# 取得文章列表（含特色圖片）
curl -s "https://example.com/wp-json/wp/v2/posts?per_page=5&_embed&_fields=id,title,excerpt,link,_embedded" | python3 -m json.tool

# 取得自訂文章類型
curl -s "https://example.com/wp-json/wp/v2/portfolio?per_page=10"

# 建立文章（需認證）
curl -X POST "https://example.com/wp-json/wp/v2/posts" \
  -H "Content-Type: application/json" \
  -u "username:application_password" \
  -d '{
    "title": "測試文章",
    "content": "這是內容",
    "status": "draft"
  }'
```

### 自訂 REST API Endpoint

```php
<?php
// 註冊自訂 API 端點
add_action('rest_api_init', function() {

    // GET /wp-json/mytheme/v1/featured-posts
    register_rest_route('mytheme/v1', '/featured-posts', [
        'methods'  => 'GET',
        'callback' => 'get_featured_posts',
        'permission_callback' => '__return_true',  // 公開
        'args' => [
            'count' => [
                'default'           => 6,
                'validate_callback' => function($param) {
                    return is_numeric($param) && $param > 0 && $param <= 50;
                },
            ],
        ],
    ]);

    // POST /wp-json/mytheme/v1/contact（需認證）
    register_rest_route('mytheme/v1', '/contact', [
        'methods'  => 'POST',
        'callback' => 'handle_contact_form',
        'permission_callback' => function() {
            return current_user_can('edit_posts');
        },
    ]);
});

function get_featured_posts($request) {
    $count = $request->get_param('count');

    $query = new WP_Query([
        'post_type'      => 'post',
        'posts_per_page' => $count,
        'meta_key'       => 'is_featured',
        'meta_value'     => '1',
    ]);

    $posts = [];
    while ($query->have_posts()) {
        $query->the_post();
        $posts[] = [
            'id'        => get_the_ID(),
            'title'     => get_the_title(),
            'excerpt'   => get_the_excerpt(),
            'link'      => get_permalink(),
            'image'     => get_the_post_thumbnail_url(get_the_ID(), 'card'),
            'date'      => get_the_date('c'),
            'acf'       => get_fields(),  // 所有 ACF 欄位
        ];
    }
    wp_reset_postdata();

    return new WP_REST_Response($posts, 200);
}

function handle_contact_form($request) {
    $name    = sanitize_text_field($request->get_param('name'));
    $email   = sanitize_email($request->get_param('email'));
    $message = sanitize_textarea_field($request->get_param('message'));

    if (!$name || !$email || !$message) {
        return new WP_Error('missing_fields', '請填寫所有欄位', ['status' => 400]);
    }

    // 發送郵件
    $sent = wp_mail(
        get_option('admin_email'),
        "網站聯絡表單 - {$name}",
        "姓名: {$name}\n信箱: {$email}\n\n{$message}"
    );

    if ($sent) {
        return new WP_REST_Response(['success' => true, 'message' => '已送出'], 200);
    }
    return new WP_Error('send_failed', '發送失敗', ['status' => 500]);
}
```

### ACF 欄位加入 REST API

```php
<?php
// 方法 1：ACF 設定中開啟（Show in REST API = Yes）

// 方法 2：手動加入
add_action('rest_api_init', function() {
    register_rest_field('portfolio', 'acf_fields', [
        'get_callback' => function($object) {
            return get_fields($object['id']);
        },
        'schema' => null,
    ]);
});
```

### 前後端分離架構（Next.js + WordPress）

```javascript
// Next.js 取 WordPress 資料
// lib/wordpress.js
const WP_API = 'https://example.com/wp-json/wp/v2';

export async function getPosts(page = 1, perPage = 10) {
  const res = await fetch(
    `${WP_API}/posts?page=${page}&per_page=${perPage}&_embed&_fields=id,title,excerpt,slug,date,_embedded`,
    { next: { revalidate: 60 } }  // ISR：60 秒重新驗證
  );
  const posts = await res.json();
  const totalPages = res.headers.get('X-WP-TotalPages');
  return { posts, totalPages };
}

export async function getPost(slug) {
  const res = await fetch(
    `${WP_API}/posts?slug=${slug}&_embed`,
    { next: { revalidate: 60 } }
  );
  const posts = await res.json();
  return posts[0] || null;
}

export async function getMenuItems(menuSlug) {
  const res = await fetch(
    `https://example.com/wp-json/mytheme/v1/menu/${menuSlug}`
  );
  return res.json();
}
```

### REST API 認證方式

```
方式 1：Application Passwords（WordPress 5.6+ 內建）
  → 使用者 → 個人資料 → Application Passwords
  → Header: Authorization: Basic base64(user:app_password)

方式 2：JWT Token（用外掛）
  → 安裝 JWT Authentication for WP-API
  → POST /wp-json/jwt-auth/v1/token { username, password }
  → Header: Authorization: Bearer <token>

方式 3：Cookie（同網域前端）
  → wp_create_nonce('wp_rest')
  → Header: X-WP-Nonce: <nonce>

推薦：
  前後端分離 → Application Passwords 或 JWT
  同站 AJAX  → Cookie + Nonce
```

---

## 八、外掛推薦清單

### 每個類別推薦 1 個（附替代方案）

| 類別 | 首選 | 替代 1 | 替代 2 |
|------|------|--------|--------|
| **SEO** | Yoast SEO | Rank Math | SEOPress |
| **安全** | Wordfence | Sucuri | iThemes Security |
| **快取** | WP Rocket（付費） | LiteSpeed Cache（免費） | W3 Total Cache |
| **備份** | UpdraftPlus | BlogVault | BackWPup |
| **表單** | WPForms | Gravity Forms | Contact Form 7 |
| **電商** | WooCommerce | Easy Digital Downloads | SureCart |
| **多語系** | WPML | Polylang | TranslatePress |
| **圖片優化** | Imagify | ShortPixel | Smush |
| **301 轉址** | Redirection | Yoast Premium | Rank Math |
| **程式片段** | Code Snippets | WPCodeBox | functions.php |
| **頁面建構** | Bricks | Elementor Pro | Breakdance |
| **Custom Fields** | ACF Pro | Meta Box | Pods |

### 推薦理由簡述

```
SEO → Yoast：生態最大、客戶最熟、文件最多
     Rank Math 免費功能更多但 UI 較複雜

安全 → Wordfence：防火牆 + 掃描 + 2FA 一站搞定
      免費版就夠用，除非需要即時 IP 黑名單

快取 → WP Rocket：設定最簡單、效果最好，但要錢（US$59/年）
      LiteSpeed Cache：用 LiteSpeed 主機的話免費且更快
      W3 Total Cache：免費但設定複雜

備份 → UpdraftPlus：免費版可備份到 Google Drive / Dropbox
      排程自動化 + 一鍵還原

表單 → WPForms：拖拉介面、客戶好上手
      Contact Form 7 免費但 UX 差

電商 → WooCommerce：台灣生態最完整（綠界/藍新都有外掛）

多語系 → WPML：最穩、客戶最多，但貴（US$99/年）
        Polylang 免費版功能已夠（手動翻譯）
```

---

## 九、安全加固

### 安全檢查清單

```
[ ] 改掉預設管理員帳號（不要用 admin）
[ ] 強密碼（12 字以上 + 特殊字元）
[ ] 啟用 2FA（Wordfence / Google Authenticator）
[ ] 改登入 URL（WPS Hide Login）
[ ] 限制登入嘗試（Wordfence 內建）
[ ] 關閉 XML-RPC
[ ] 關閉檔案編輯器（DISALLOW_FILE_EDIT）
[ ] 關閉目錄瀏覽
[ ] 設定正確的檔案權限
[ ] 加安全 Header
[ ] SSL 強制（全站 HTTPS）
[ ] 隱藏 WordPress 版本號
[ ] 定期更新（核心 + 外掛 + 主題）
[ ] 自動備份（每日）
[ ] 監控（Wordfence 掃描 / Sucuri 監控）
```

### wp-config.php 安全加固

```php
<?php
// ========== 安全設定 ==========

// 停用檔案編輯器（防止後台改 PHP）
define('DISALLOW_FILE_EDIT', true);

// 停用外掛/主題安裝（正式站建議開啟）
// define('DISALLOW_FILE_MODS', true);

// 強制 SSL 登入
define('FORCE_SSL_ADMIN', true);

// 安全金鑰（去 https://api.wordpress.org/secret-key/1.1/salt/ 產生）
define('AUTH_KEY',         '換成你的金鑰');
define('SECURE_AUTH_KEY',  '換成你的金鑰');
define('LOGGED_IN_KEY',    '換成你的金鑰');
define('NONCE_KEY',        '換成你的金鑰');
define('AUTH_SALT',        '換成你的金鑰');
define('SECURE_AUTH_SALT', '換成你的金鑰');
define('LOGGED_IN_SALT',   '換成你的金鑰');
define('NONCE_SALT',       '換成你的金鑰');

// 資料庫前綴（不要用預設 wp_）
$table_prefix = 'oc_';

// 限制修訂版本數量
define('WP_POST_REVISIONS', 5);

// 自動清空垃圾桶（天數）
define('EMPTY_TRASH_DAYS', 14);

// 停用 WP Cron（用系統 cron 取代）
define('DISABLE_WP_CRON', true);
// 然後在 crontab 加入：
// */5 * * * * curl -s https://example.com/wp-cron.php > /dev/null 2>&1

// Debug 模式（正式站關閉）
define('WP_DEBUG', false);
define('WP_DEBUG_LOG', false);
define('WP_DEBUG_DISPLAY', false);
```

### .htaccess 安全規則（Apache）

```apache
# 禁止目錄瀏覽
Options -Indexes

# 保護 wp-config.php
<Files wp-config.php>
    order allow,deny
    deny from all
</Files>

# 保護 .htaccess
<Files .htaccess>
    order allow,deny
    deny from all
</Files>

# 禁止 PHP 在 uploads 執行
<Directory "/var/www/html/wp-content/uploads">
    <Files "*.php">
        deny from all
    </Files>
</Directory>

# 關閉 XML-RPC
<Files xmlrpc.php>
    order deny,allow
    deny from all
</Files>

# 限制登入頁面存取（只允許特定 IP）
# <Files wp-login.php>
#     order deny,allow
#     deny from all
#     allow from 你的IP
# </Files>

# 安全 Header
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
    Header set Permissions-Policy "camera=(), microphone=(), geolocation=()"
</IfModule>
```

### Wordfence 設定建議

```
Firewall:
  - Web Application Firewall: Enabled and Protecting
  - Brute Force Protection: Lock out after 5 failed attempts
  - Lock out duration: 4 hours
  - Rate Limiting: Throttle crawlers

Scan:
  - Scan Schedule: Daily
  - Scan Type: Standard Scan
  - Check: Core files / Themes / Plugins / Malware signatures

Login Security:
  - 2FA: Enable for all admins
  - reCAPTCHA: Enable on login & registration
  - Disable XML-RPC authentication: Yes
```

### 改登入 URL

```bash
# 安裝 WPS Hide Login
wp plugin install wps-hide-login --activate

# 設定新的登入路徑（例如 /my-secret-login）
wp option update whl_page 'my-secret-login'
```

### 檔案權限設定

```bash
# 正確的 WordPress 檔案權限
# 目錄：755 / 檔案：644 / wp-config.php：600

find /var/www/wordpress -type d -exec chmod 755 {} \;
find /var/www/wordpress -type f -exec chmod 644 {} \;
chmod 600 /var/www/wordpress/wp-config.php

# 擁有者設為 web server
chown -R www-data:www-data /var/www/wordpress
```

---

## 十、效能優化

### 效能檢查清單

```
[ ] 快取外掛（WP Rocket / LiteSpeed Cache）
[ ] 圖片優化（WebP 轉換 + Lazy Load）
[ ] CDN（Cloudflare / BunnyCDN）
[ ] 物件快取（Redis / Memcached）
[ ] 資料庫清理（修訂版本/暫存/垃圾）
[ ] PHP 8.2+（比 7.4 快 30%+）
[ ] OPcache 啟用
[ ] GZIP / Brotli 壓縮
[ ] 減少 HTTP 請求
[ ] 延遲載入非關鍵 JS/CSS
[ ] 移除不用的外掛
[ ] 使用系統 cron（取代 WP Cron）
```

### WP Rocket 設定建議（最簡單有效）

```
Cache:
  - Enable caching for mobile: Yes
  - Cache Lifespan: 10 hours

File Optimization:
  - Minify CSS: Yes
  - Combine CSS: No（HTTP/2 不需要）
  - Remove Unused CSS: Yes（重要！減少 80%+ CSS）
  - Minify JavaScript: Yes
  - Defer JavaScript: Yes
  - Delay JavaScript Execution: Yes

Media:
  - LazyLoad for images: Yes
  - LazyLoad for iframes/videos: Yes
  - Add missing image dimensions: Yes
  - WebP Compatibility: Yes

Preload:
  - Activate Preloading: Yes
  - Enable link preloading: Yes
  - Prefetch DNS: 加入外部網域

Database:
  - Post Revisions: Clean
  - Auto Drafts: Clean
  - Transients: Clean
  - Optimize Tables: Yes
  - Schedule Automatic Cleanup: Weekly
```

### LiteSpeed Cache 設定（LiteSpeed 主機免費）

```
General:
  - Enable LiteSpeed Cache: On

Cache:
  - Enable Cache: On
  - Cache Logged-in Users: Off
  - Cache Mobile: On
  - Private Cached URIs: /my-account

Page Optimization:
  - CSS Minify: On
  - JS Minify: On
  - HTML Minify: On
  - Load CSS Asynchronously: On
  - Generate Critical CSS: On（重要）
  - Load JS Deferred: On
  - Lazy Load Images: On
  - Responsive Placeholder: On
  - WebP Replacement: On

Object Cache:
  - Enable: On（需要 Redis/Memcached）
  - Method: Redis
  - Host: 127.0.0.1
  - Port: 6379

CDN:
  - Enable CDN: On
  - CDN URL: cdn.example.com
  - Cloudflare API: 填入 API Token
```

### Redis Object Cache 設定

```bash
# 安裝 Redis
sudo apt install redis-server
sudo systemctl enable redis-server

# 安裝 WP 外掛
wp plugin install redis-cache --activate

# wp-config.php 加入
# define('WP_REDIS_HOST', '127.0.0.1');
# define('WP_REDIS_PORT', 6379);
# define('WP_REDIS_DATABASE', 0);
# define('WP_REDIS_PREFIX', 'wp_');

# 啟用 Object Cache
wp redis enable

# 驗證
wp redis status
```

### 資料庫清理（WP-CLI）

```bash
# 清理修訂版本
wp post delete $(wp post list --post_type='revision' --format=ids) --force

# 清理自動草稿
wp post delete $(wp post list --post_status=auto-draft --format=ids) --force

# 清理垃圾桶
wp post delete $(wp post list --post_status=trash --format=ids) --force

# 清理過期 Transients
wp transient delete --expired

# 清理所有 Transients
wp transient delete --all

# 優化資料庫表
wp db optimize

# 用 SQL 清理孤立 postmeta
wp db query "DELETE pm FROM wp_postmeta pm LEFT JOIN wp_posts p ON pm.post_id = p.ID WHERE p.ID IS NULL;"
```

### CDN 設定（Cloudflare 免費方案）

```
1. 註冊 Cloudflare → 加入網域
2. 更改 DNS Nameserver 到 Cloudflare
3. SSL/TLS → Full (Strict)
4. Speed → Optimization:
   - Auto Minify: CSS + JS + HTML
   - Brotli: On
   - Early Hints: On
   - Rocket Loader: Off（和 WP Rocket 衝突）
5. Caching:
   - Caching Level: Standard
   - Browser Cache TTL: 1 month
6. Page Rules（3 條免費）:
   - wp-admin/* → Cache Level: Bypass
   - wp-login.php → Cache Level: Bypass
   - *example.com/* → Cache Level: Cache Everything, Edge TTL: 1 month
```

---

## 十一、備份與搬家

### UpdraftPlus 設定（推薦）

```
Settings:
  - Files backup schedule: Daily, retain 7
  - Database backup schedule: Daily, retain 14
  - Remote storage: Google Drive（免費 15GB）

Include in files backup:
  - Plugins: Yes
  - Themes: Yes
  - Uploads: Yes
  - Must-use plugins: Yes
  - wp-content（其他目錄）: Yes

Exclude:
  - updraft (備份檔本身)
  - cache
  - backup*
```

### All-in-One WP Migration（搬家神器）

```bash
# 安裝
wp plugin install all-in-one-wp-migration --activate

# 匯出（CLI 方式，需 Pro 版）
# 或直接在後台：All-in-One WP Migration → Export → File

# 匯入限制解除（免費版限制 512MB）
# 在 wp-config.php 加入：
# define('AI1WM_MAX_FILE_SIZE', 536870912);  // 512MB

# 或用 .htaccess：
# php_value upload_max_filesize 512M
# php_value post_max_size 512M
# php_value memory_limit 512M
# php_value max_execution_time 300
# php_value max_input_time 300
```

### WP-CLI 備份（工程師最愛）

```bash
#!/bin/bash
# wp-backup.sh — 完整備份腳本

SITE_DIR="/var/www/wordpress"
BACKUP_DIR="/backup/wordpress"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="wordpress_db"

# 建立備份目錄
mkdir -p "$BACKUP_DIR"

# 備份資料庫
wp db export "$BACKUP_DIR/db_$DATE.sql" --path="$SITE_DIR"

# 壓縮資料庫備份
gzip "$BACKUP_DIR/db_$DATE.sql"

# 備份檔案（排除快取和備份檔）
tar -czf "$BACKUP_DIR/files_$DATE.tar.gz" \
  --exclude='wp-content/cache' \
  --exclude='wp-content/updraft' \
  --exclude='wp-content/backup*' \
  -C "$SITE_DIR" .

# 保留最近 7 天
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete

echo "備份完成：$DATE"
echo "資料庫：db_$DATE.sql.gz"
echo "檔案：files_$DATE.tar.gz"
```

### 搬家 SOP（A 主機 → B 主機）

```bash
# === 在舊主機 A ===

# 1. 匯出資料庫
wp db export backup.sql

# 2. 打包檔案
tar -czf site-backup.tar.gz \
  --exclude='wp-content/cache' \
  wp-content/ wp-config.php .htaccess

# 3. 下載到本機
scp user@old-server:/var/www/wordpress/backup.sql .
scp user@old-server:/var/www/wordpress/site-backup.tar.gz .

# === 在新主機 B ===

# 4. 安裝乾淨 WordPress
wp core download --locale=zh_TW

# 5. 上傳檔案
scp site-backup.tar.gz user@new-server:/var/www/wordpress/
ssh user@new-server "cd /var/www/wordpress && tar -xzf site-backup.tar.gz"

# 6. 建立資料庫
wp config create --dbname=newdb --dbuser=newuser --dbpass='新密碼'

# 7. 匯入資料庫
wp db import backup.sql

# 8. 替換網址（重要！）
wp search-replace 'https://old-domain.com' 'https://new-domain.com' --all-tables --precise

# 9. 清除快取
wp cache flush
wp rewrite flush

# 10. 驗證
wp option get siteurl
wp option get home
```

---

## 十二、常見問題 20 題

### 1. 白屏（WSOD）

```bash
# 啟用 debug
wp config set WP_DEBUG true --raw
wp config set WP_DEBUG_LOG true --raw
# 看 log
tail -50 wp-content/debug.log

# 常見原因：外掛衝突 → 停用所有外掛
wp plugin deactivate --all
# 逐個啟用找出問題外掛
wp plugin activate plugin-name
```

### 2. 外掛衝突

```bash
# 停用所有外掛
wp plugin deactivate --all

# 逐個啟用，每次啟用後測試
wp plugin activate wordfence
# 測試...
wp plugin activate wordpress-seo
# 測試...
# 重複直到找到衝突外掛
```

### 3. 更新後壞掉

```bash
# 回復到上一個版本（以 WooCommerce 為例）
wp plugin install woocommerce --version=8.5.0 --force
# 或從備份還原
```

### 4. 被駭（網站被植入惡意程式）

```bash
# 1. 先備份現有狀態（保留證據）
wp db export hacked-backup.sql

# 2. 掃描惡意檔案
grep -r "eval(" wp-content/ --include="*.php" -l
grep -r "base64_decode" wp-content/ --include="*.php" -l
grep -r "system(" wp-content/ --include="*.php" -l

# 3. 重新安裝核心
wp core download --force

# 4. 重新安裝所有外掛
wp plugin install --force $(wp plugin list --field=name --format=csv)

# 5. 刪除可疑檔案
find wp-content/uploads -name "*.php" -delete

# 6. 更換安全金鑰
wp config shuffle-salts

# 7. 更改所有密碼
wp user update admin --user_pass='新超強密碼'

# 8. 安裝 Wordfence 做完整掃描
wp plugin install wordfence --activate
```

### 5. 速度慢

```
診斷步驟：
1. GTmetrix / PageSpeed Insights 測試
2. Query Monitor 外掛檢查慢查詢
3. 檢查外掛數量（超過 30 個要檢討）
4. 檢查圖片大小（單張不超過 200KB）
5. 檢查主機回應時間（TTFB < 500ms）

快速修復：
- 安裝快取外掛
- 圖片壓縮 + WebP
- 停用不必要的外掛
- 升級 PHP 到 8.2+
- 考慮換主機
```

### 6. 忘記管理員密碼

```bash
wp user update admin --user_pass='新密碼'
# 或用 email
wp user reset-password admin
```

### 7. 媒體上傳失敗

```bash
# 檢查 PHP 上傳限制
php -i | grep upload_max_filesize
php -i | grep post_max_size

# 修改 php.ini 或 .htaccess
# upload_max_filesize = 64M
# post_max_size = 64M
# memory_limit = 256M
# max_execution_time = 300

# 檢查目錄權限
ls -la wp-content/uploads/
chmod 755 wp-content/uploads/
chown www-data:www-data wp-content/uploads/
```

### 8. 永久連結 404

```bash
wp rewrite flush
# 如果還不行，檢查 .htaccess 是否有 WordPress 規則
# 或 Nginx 是否有 try_files
```

### 9. 記憶體不足（Allowed memory size exhausted）

```php
// wp-config.php
define('WP_MEMORY_LIMIT', '256M');
define('WP_MAX_MEMORY_LIMIT', '512M');
```

### 10. 排程任務不執行（WP Cron）

```bash
# 測試 cron
wp cron test
# 手動執行所有到期事件
wp cron event run --due-now
# 列出排程
wp cron event list

# 用系統 cron 取代（更可靠）
# wp-config.php: define('DISABLE_WP_CRON', true);
# crontab: */5 * * * * curl -s https://example.com/wp-cron.php > /dev/null
```

### 11. REST API 回傳 401/403

```
檢查：
1. .htaccess 是否擋了 Authorization header
2. Wordfence / Security 外掛是否擋了 REST API
3. Application Password 是否正確
4. 用戶是否有對應權限
```

### 12. 資料庫連線錯誤

```bash
# 確認資料庫資訊正確
wp config get DB_NAME
wp config get DB_USER
wp config get DB_HOST

# 測試連線
wp db check

# 修復資料庫
wp db repair
```

### 13. SSL 混合內容警告

```bash
# 替換所有 http:// 為 https://
wp search-replace 'http://example.com' 'https://example.com' --all-tables
```

### 14. 外掛自動停用

```
原因：PHP Fatal Error
解法：
1. 查 debug.log
2. 用 FTP/SSH 改外掛檔名暫時停用
3. 確認 PHP 版本相容性
4. 聯絡外掛開發者
```

### 15. 登入後跳轉迴圈

```php
// wp-config.php 加入
define('WP_HOME', 'https://example.com');
define('WP_SITEURL', 'https://example.com');
// 清除 cookies 再登入
```

### 16. 文章/頁面顯示 404 但實際存在

```bash
wp rewrite flush
# 檢查自訂文章類型的 rewrite slug 是否和頁面 slug 衝突
```

### 17. 更新時卡住「維護模式」

```bash
# 刪除維護模式檔案
rm /var/www/wordpress/.maintenance
```

### 18. Email 發送失敗

```bash
# 安裝 SMTP 外掛
wp plugin install wp-mail-smtp --activate
# 用 Gmail / SendGrid / Mailgun SMTP
# 或用 Brevo (Sendinblue) 免費方案（每天 300 封）
```

### 19. 多人同時編輯文章衝突

```
解法：安裝 Post Lock 外掛
或在 wp-config.php：
define('AUTOSAVE_INTERVAL', 300);  // 自動儲存間隔改 5 分鐘
```

### 20. WordPress 佔太多磁碟空間

```bash
# 檢查佔空間的目錄
du -sh wp-content/uploads/
du -sh wp-content/cache/
du -sh wp-content/updraft/

# 清理修訂版本
wp post delete $(wp post list --post_type='revision' --format=ids) --force

# 清理未使用的媒體（小心操作）
# 後台 → 媒體 → 未附加
```

---

## 十三、WooCommerce 快速設定

### 安裝

```bash
wp plugin install woocommerce --activate
wp plugin install woocommerce-gateway-stripe --activate  # 國際金流
```

### 台灣金流串接（綠界 ECPay）

```bash
# 安裝綠界外掛
# 到 https://github.com/ECPay 下載官方外掛
# 或 WordPress 外掛庫搜尋 ECPay

# 綠界設定重點：
# 1. 測試環境 Merchant ID: 3002607
# 2. 測試 HashKey / HashIV 在官網取得
# 3. 付款方式：信用卡 + ATM + 超商代碼
# 4. 回傳 URL 設定正確（/wc-api/ecpay_payment/）
```

### 物流設定（綠界物流）

```
超商取貨：
1. 安裝綠界物流外掛
2. 設定物流子類型：7-ELEVEN / 全家 / 萊爾富 / OK
3. 設定溫層：常溫 / 低溫
4. 運費設定：免運門檻 + 運費金額

宅配：
1. WooCommerce → 設定 → 運送 → 運送區域
2. 新增「台灣」區域
3. 加入運送方式：固定費率 / 免費運送
```

### 商品設定範例

```
簡單商品：
  - 標題、描述、價格
  - SKU（庫存單位）
  - 庫存管理（追蹤數量）
  - 運送：重量 + 尺寸
  - 特色圖片 + 商品圖庫

可變商品（有尺寸/顏色）：
  1. 新增屬性：顏色（紅/藍/綠）、尺寸（S/M/L）
  2. 勾選「用於可變商品」
  3. 切到「Variations」→ 從所有屬性建立可變商品
  4. 分別設定每個變體的價格/庫存/圖片

虛擬商品（課程/服務）：
  - 勾選「虛擬」（不需運送）
  - 勾選「可下載」（提供檔案下載）
```

### 發票設定（台灣電子發票）

```
推薦外掛：
1. 綠界電子發票（ECPay Invoice）
2. ezPay 電子發票

設定流程：
1. 在綠界/ezPay 申請電子發票 API
2. 安裝對應外掛
3. 填入 Merchant ID + HashKey + HashIV
4. 設定發票類型：個人（手機載具/email）/ 公司（統編）
5. 自動開立時機：付款完成 / 訂單完成
```

### WooCommerce 效能優化

```bash
# 停用不需要的功能
# functions.php
add_filter('woocommerce_enqueue_styles', '__return_empty_array');  // 停用 WC CSS（自己寫）

# 只在商店頁載入 WC 資源
function conditionally_load_wc() {
    if (!is_woocommerce() && !is_cart() && !is_checkout()) {
        wp_dequeue_style('woocommerce-layout');
        wp_dequeue_style('woocommerce-smallscreen');
        wp_dequeue_style('woocommerce-general');
        wp_dequeue_script('wc-cart-fragments');  # 重要！這個很慢
    }
}
add_action('wp_enqueue_scripts', 'conditionally_load_wc', 99);

# 停用 WC 管理面板通知
add_filter('woocommerce_helper_suppress_admin_notices', '__return_true');

# 減少商品查詢
# WooCommerce → 設定 → Products → 每頁顯示 12 個（不要太多）
```

---

## 十四、WordPress Multisite

### 什麼時候用 Multisite？

```
適合：
  - 同一組織多個子站（分公司/分校/多語系）
  - 教育平台（每個班級一個站）
  - 客戶代管多站（統一管理更新）
  - SaaS 產品（每個客戶一個站）

不適合：
  - 只有 2-3 個不相關的站（獨立裝比較好）
  - 需要不同外掛組合的多站
  - 網站之間差異很大
  - 客戶需要各自管理外掛

注意：
  - Multisite 共用核心 + 外掛 + 主題
  - 外掛只能 Network Admin 安裝（子站不能自己裝）
  - 有些外掛不支援 Multisite
  - 一個站壞可能影響所有站
```

### 設定方法

```php
// 步驟 1：wp-config.php 加入（在 "That's all" 之前）
define('WP_ALLOW_MULTISITE', true);

// 步驟 2：後台 → 工具 → 網站網路設定 → 安裝
// 選擇：子網域（site1.example.com）或子目錄（example.com/site1）

// 步驟 3：依照指示修改 wp-config.php
define('MULTISITE', true);
define('SUBDOMAIN_INSTALL', false);  // true = 子網域 / false = 子目錄
define('DOMAIN_CURRENT_SITE', 'example.com');
define('PATH_CURRENT_SITE', '/');
define('SITE_ID_CURRENT_SITE', 1);
define('BLOG_ID_CURRENT_SITE', 1);

// 步驟 4：修改 .htaccess（WordPress 會提供）
```

### Multisite WP-CLI 管理

```bash
# 列出所有站台
wp site list

# 建立新站台
wp site create --slug=newsite --title="新站台" --email=admin@example.com

# 在特定站台執行指令
wp plugin list --url=example.com/site2

# 啟用外掛（全網路）
wp plugin activate wordpress-seo --network

# 啟用主題（全網路可用）
wp theme enable flavor --network
```

---

## 十五、WP-CLI 指令速查

### 安裝 WP-CLI

```bash
# 安裝
curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
chmod +x wp-cli.phar
sudo mv wp-cli.phar /usr/local/bin/wp

# 驗證
wp --info

# 自動補全（zsh）
echo 'autoload bashcompinit && bashcompinit' >> ~/.zshrc
source <(wp cli completions --line="$(which wp)")
```

### 核心管理

```bash
wp core version                      # 目前版本
wp core check-update                 # 檢查更新
wp core update                       # 更新核心
wp core update-db                    # 更新資料庫
wp core download --locale=zh_TW      # 下載（指定語系）
wp core verify-checksums             # 驗證核心檔案完整性
```

### 外掛管理

```bash
wp plugin list                       # 列出所有外掛
wp plugin install <slug> --activate  # 安裝並啟用
wp plugin activate <slug>            # 啟用
wp plugin deactivate <slug>          # 停用
wp plugin deactivate --all           # 停用全部
wp plugin delete <slug>              # 刪除
wp plugin update --all               # 更新全部
wp plugin search "cache"             # 搜尋外掛
wp plugin status                     # 外掛狀態
wp plugin verify-checksums --all     # 驗證外掛完整性
```

### 主題管理

```bash
wp theme list                        # 列出主題
wp theme install flavor --activate   # 安裝並啟用
wp theme activate flavor             # 切換主題
wp theme update --all                # 更新全部
wp theme delete flavor               # 刪除
```

### 使用者管理

```bash
wp user list                                  # 列出使用者
wp user create john john@example.com --role=editor  # 建立
wp user update 1 --user_pass='新密碼'           # 改密碼
wp user delete 5 --reassign=1                  # 刪除（文章移給 ID 1）
wp user set-role 3 administrator               # 改角色
wp user list --role=subscriber --format=csv    # 匯出訂閱者
```

### 文章與頁面

```bash
wp post list                                   # 列出文章
wp post list --post_type=page                  # 列出頁面
wp post create --post_title='標題' --post_status=publish  # 建立
wp post update 42 --post_title='新標題'         # 更新
wp post delete 42 --force                      # 永久刪除
wp post generate --count=10                    # 產生測試文章
wp post meta get 42 _yoast_wpseo_title         # 取得 meta
wp post meta update 42 custom_field "value"    # 更新 meta
```

### 資料庫操作

```bash
wp db export backup.sql              # 匯出
wp db import backup.sql              # 匯入
wp db optimize                       # 優化
wp db repair                         # 修復
wp db check                          # 檢查
wp db size --tables                  # 各表大小
wp db query "SELECT * FROM wp_options WHERE option_name LIKE '%siteurl%'"
```

### 搜尋替換

```bash
# 搬家必用
wp search-replace 'old-domain.com' 'new-domain.com' --all-tables --precise

# 乾跑（不真的改）
wp search-replace 'old' 'new' --dry-run

# 只搜尋特定表
wp search-replace 'http://' 'https://' wp_posts wp_postmeta

# 匯出搜尋替換結果
wp search-replace 'old' 'new' --export=replaced.sql
```

### 快取管理

```bash
wp cache flush                       # 清除物件快取
wp transient delete --expired        # 清除過期 Transients
wp transient delete --all            # 清除所有 Transients
wp rewrite flush                     # 清除永久連結快取
```

### 維護模式

```bash
wp maintenance-mode activate         # 開啟維護模式
wp maintenance-mode deactivate       # 關閉維護模式
wp maintenance-mode status           # 檢查狀態
```

### 選項管理

```bash
wp option get siteurl                # 取得選項
wp option update siteurl 'https://new.com'  # 更新
wp option list --search="*woocommerce*"     # 搜尋
wp option delete _transient_timeout_* --yes # 批次刪除
```

### Cron 管理

```bash
wp cron test                         # 測試 cron 是否運作
wp cron event list                   # 列出排程事件
wp cron event run --due-now          # 執行到期事件
wp cron event delete <hook>          # 刪除排程
wp cron schedule list                # 列出排程頻率
```

### 媒體管理

```bash
wp media regenerate --yes            # 重新產生所有縮圖
wp media regenerate --image_size=thumbnail  # 只重新產生特定尺寸
wp media import /path/to/images/*    # 批次匯入圖片
```

### 實用組合指令

```bash
# 完整健康檢查
wp core verify-checksums && wp plugin verify-checksums --all && echo "OK"

# 匯出所有文章為 CSV
wp post list --post_type=post --fields=ID,post_title,post_date,post_status --format=csv > posts.csv

# 批次更新文章狀態
wp post list --post_status=draft --format=ids | xargs -I {} wp post update {} --post_status=publish

# 找出最大的資料庫表
wp db size --tables --format=csv | sort -t',' -k2 -rn | head -10

# 安全更新全部（核心 + 外掛 + 主題）
wp core update && wp plugin update --all && wp theme update --all && wp core update-db
```

---

## 附錄：接案 WordPress 專案 Checklist

```
規劃階段：
[ ] 確認主機方案
[ ] 確認網域 + DNS
[ ] 確認設計稿/Wireframe
[ ] 確認功能需求（表單/電商/會員/多語系）
[ ] 報價含維護費（月費/年費）

開發階段：
[ ] WordPress 安裝 + 初始設定
[ ] 主題安裝/開發
[ ] 外掛安裝與設定
[ ] 頁面建構（首頁/關於/服務/聯絡）
[ ] 表單設定 + Email 測試
[ ] SEO 基本設定（Yoast）
[ ] 響應式測試（手機/平板/桌面）
[ ] 速度測試（GTmetrix < 3 秒）

上線前：
[ ] SSL 設定
[ ] 安全加固（Wordfence + 2FA）
[ ] 備份設定（UpdraftPlus）
[ ] 快取設定
[ ] 404 頁面
[ ] robots.txt + sitemap.xml
[ ] Google Analytics + Search Console
[ ] 法律頁面（隱私權政策/Cookie）

交付：
[ ] 客戶帳號建立（Editor 角色，不給 Admin）
[ ] 操作教學文件/影片
[ ] 維護合約簽訂
[ ] 交付備份一份給客戶
```

---

> 本手冊由 OpenClaw 星艦指揮中心維護
> 有問題查 cookbook/ 目錄或問小蔡
