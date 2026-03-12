#!/bin/bash
# NEUXA 客戶跟進自動化系統 v1.0
# 使用方式: ./follow-up-system.sh [check|add|list]

DATA_FILE="$HOME/.openclaw/workspace/data/customers.json"
mkdir -p "$HOME/.openclaw/workspace/data"

# 初始化資料檔
if [ ! -f "$DATA_FILE" ]; then
    echo '[]' > "$DATA_FILE"
fi

# 顯示今天需跟進的客戶
check_followups() {
    TODAY=$(date +%Y-%m-%d)
    echo "📋 客戶跟進提醒 - $TODAY"
    echo "========================================"
    
    # 使用 node 處理 JSON
    node -e "
        const fs = require('fs');
        const data = JSON.parse(fs.readFileSync('$DATA_FILE', 'utf8'));
        const today = '$TODAY';
        
        const followups = data.filter(c => c.next_followup === today && c.status === 'active');
        
        if (followups.length === 0) {
            console.log('✅ 今天沒有需要跟進的客戶');
        } else {
            console.log('🔔 今天有 ' + followups.length + ' 位客戶需跟進：\n');
            followups.forEach((c, i) => {
                console.log((i+1) + '. ' + c.name + ' (' + c.phone + ')');
                console.log('   階段: ' + c.stage);
                console.log('   需求: ' + c.interest);
                console.log('   預算: ' + c.budget);
                console.log('   備註: ' + (c.notes || '無'));
                
                // 提供建議話術
                let script = '';
                if (c.stage === 'Day1-感謝') {
                    script = '「' + c.name + '您好，我是住商老蔡，今天感謝您抽空看屋，這邊把一些補充資料傳給您...」';
                } else if (c.stage === 'Day3-詢問意向') {
                    script = '「' + c.name + '您好，請問前天看的房子您這邊覺得如何？有什麼問題我可以幫您解答...」';
                } else if (c.stage === 'Day7-推薦新物件') {
                    script = '「' + c.name + '您好，這週有新上架的物件可能符合您的需求，要不要安排看看...」';
                } else if (c.stage === 'Day14-最後跟進') {
                    script = '「' + c.name + '您好，想說跟您確認一下，如果目前沒有適合的，我會持續幫您留意，有新品第一时间通知您...」';
                }
                console.log('   💬 建議話術: ' + script);
                console.log('');
            });
        }
    "
}

# 新增客戶
add_customer() {
    echo "新增客戶資料"
    echo "========================================"
    read -p "姓名: " name
    read -p "電話: " phone
    read -p "需求 (如: 楊梅區3房): " interest
    read -p "預算 (如: 1000-1200萬): " budget
    read -p "備註: " notes
    
    TODAY=$(date +%Y-%m-%d)
    TOMORROW=$(date -v+1d +%Y-%m-%d 2>/dev/null || date -d "+1 day" +%Y-%m-%d)
    
    node -e "
        const fs = require('fs');
        const data = JSON.parse(fs.readFileSync('$DATA_FILE', 'utf8'));
        const newId = 'C' + String(data.length + 1).padStart(3, '0');
        
        data.push({
            id: newId,
            name: '$name',
            phone: '$phone',
            interest: '$interest',
            budget: '$budget',
            first_contact: '$TODAY',
            next_followup: '$TOMORROW',
            stage: 'Day1-感謝',
            status: 'active',
            notes: '$notes'
        });
        
        fs.writeFileSync('$DATA_FILE', JSON.stringify(data, null, 2));
        console.log('✅ 客戶 ' + newId + ' 新增完成');
        console.log('📅 預計跟進日: $TOMORROW');
    "
}

# 列出所有客戶
list_customers() {
    echo "📊 所有客戶列表"
    echo "========================================"
    
    node -e "
        const fs = require('fs');
        const data = JSON.parse(fs.readFileSync('$DATA_FILE', 'utf8'));
        
        if (data.length === 0) {
            console.log('尚無客戶資料');
        } else {
            console.log('總計 ' + data.length + ' 位客戶:\n');
            data.forEach(c => {
                const status = c.status === 'active' ? '🟢' : '⚫';
                console.log(status + ' ' + c.id + ' | ' + c.name + ' | ' + c.phone + ' | 下次跟進: ' + c.next_followup + ' | ' + c.stage);
            });
        }
    "
}

# 主程式
case "$1" in
    check)
        check_followups
        ;;
    add)
        add_customer
        ;;
    list)
        list_customers
        ;;
    *)
        echo "NEUXA 客戶跟進自動化系統 v1.0"
        echo "使用方法:"
        echo "  ./follow-up-system.sh check  # 檢查今天需跟進的客戶"
        echo "  ./follow-up-system.sh add    # 新增客戶"
        echo "  ./follow-up-system.sh list   # 列出所有客戶"
        ;;
esac
