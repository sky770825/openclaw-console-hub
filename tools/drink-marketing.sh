#!/bin/bash
# NEUXA 飲料店精準行銷系統 v1.0
# 功能：客戶分群 + 個人化推播內容生成

DATA_FILE="$HOME/.openclaw/workspace/data/drink-customers.json"
mkdir -p "$HOME/.openclaw/workspace/data"

# 初始化
if [ ! -f "$DATA_FILE" ]; then
    echo '[]' > "$DATA_FILE"
fi

# 分析客戶並生成推播建議
analyze_customers() {
    echo "🥤 飲料店客戶分析與行銷建議"
    echo "========================================"
    
    node -e "
        const fs = require('fs');
        const data = JSON.parse(fs.readFileSync('$DATA_FILE', 'utf8'));
        
        if (data.length === 0) {
            console.log('尚無客戶資料，請先新增');
            return;
        }
        
        // 分群統計
        const segments = {
            '早班族': data.filter(c => c.type === '早班族'),
            '學生': data.filter(c => c.type === '學生'),
            '上班族': data.filter(c => c.type === '上班族'),
            '家庭客': data.filter(c => c.type === '家庭客')
        };
        
        console.log('📊 客戶分群統計：');
        Object.entries(segments).forEach(([type, list]) => {
            console.log('  ' + type + ': ' + list.length + ' 人');
        });
        console.log('');
        
        // 生成今日推播建議
        const hour = new Date().getHours();
        let timeSlot = '';
        let promo = '';
        
        if (hour >= 7 && hour < 11) {
            timeSlot = '上午時段';
            promo = '早晨優惠：買一送一（指定飲品）';
        } else if (hour >= 11 && hour < 14) {
            timeSlot = '午餐時段';
            promo = '午餐套餐：飲料+輕食 9折';
        } else if (hour >= 14 && hour < 17) {
            timeSlot = '下午茶時段';
            promo = '下午茶優惠：第二杯半價';
        } else if (hour >= 17 && hour < 21) {
            timeSlot = '晚間時段';
            promo = '晚間特惠：打卡送小料';
        } else {
            timeSlot = '離峰時段';
            promo = '深夜優惠：全品項 8 折';
        }
        
        console.log('🎯 今日 ' + timeSlot + ' 行銷建議：');
        console.log('   活動：' + promo);
        console.log('');
        
        // 針對各群生成推播文案
        console.log('💬 分群推播文案：\n');
        
        Object.entries(segments).forEach(([type, list]) => {
            if (list.length === 0) return;
            
            let message = '';
            switch(type) {
                case '早班族':
                    message = '【早安優惠】早上好！今日早晨特調已準備好，上班前提神首選。' + promo + '，限時供應中！';
                    break;
                case '學生':
                    message = '【學生專屬】同學們看過來！今日限定優惠來啦～' + promo + '，帶學生證來店享優惠！';
                    break;
                case '上班族':
                    message = '【上班族充電站】工作辛苦了！來杯飲料充電吧。' + promo + '，給自己一個小確幸！';
                    break;
                case '家庭客':
                    message = '【家庭同樂】全家一起來！' + promo + '，大人小孩都愛的口味這裡都有～';
                    break;
            }
            
            console.log(type + '（' + list.length + '人）：');
            console.log('  「' + message + '」\n');
        });
        
        console.log('📱 建議發送渠道：');
        console.log('  • Line 官方帳號：針對早班族、上班族');
        console.log('  • Instagram：針對學生、家庭客');
        console.log('  • 店內海報：針對路過客、新客');
    "
}

# 新增客戶
add_customer() {
    echo "新增飲料店客戶"
    echo "========================================"
    read -p "姓名: " name
    read -p "電話: " phone
    echo "客戶類型:"
    echo "  1. 早班族"
    echo "  2. 學生"
    echo "  3. 上班族"
    echo "  4. 家庭客"
    read -p "選擇 (1-4): " type_choice
    
    case $type_choice in
        1) type="早班族" ;;
        2) type="學生" ;;
        3) type="上班族" ;;
        4) type="家庭客" ;;
        *) type="一般客" ;;
    esac
    
    read -p "偏好飲品: " fav
    read -p "消費頻率 (每週幾次): " freq
    
    node -e "
        const fs = require('fs');
        const data = JSON.parse(fs.readFileSync('$DATA_FILE', 'utf8'));
        const newId = 'D' + String(data.length + 1).padStart(3, '0');
        
        data.push({
            id: newId,
            name: '$name',
            phone: '$phone',
            type: '$type',
            favorite: '$fav',
            frequency: '$freq',
            last_visit: '$(date +%Y-%m-%d)',
            status: 'active'
        });
        
        fs.writeFileSync('$DATA_FILE', JSON.stringify(data, null, 2));
        console.log('✅ 客戶 ' + newId + ' 新增完成');
    "
}

# 主程式
case "$1" in
    analyze)
        analyze_customers
        ;;
    add)
        add_customer
        ;;
    *)
        echo "NEUXA 飲料店精準行銷系統 v1.0"
        echo "使用方法:"
        echo "  ./drink-marketing.sh analyze  # 分析客戶並生成今日推播建議"
        echo "  ./drink-marketing.sh add      # 新增客戶"
        ;;
esac
