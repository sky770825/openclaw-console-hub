import os
from crewai import Agent, Task, Crew, Process
from dotenv import load_dotenv

# 載入 .env 檔案中的環境變數
load_dotenv()

# 設定 OpenAI API 金鑰
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")

# --- 1. 定義 Agent (代理人) ---

researcher = Agent(
    role='專業研究員',
    goal='找出關於特定主題的詳細資訊並總結重點',
    backstory='一位經驗豐富的資訊收集者，擅長從各種來源提取關鍵數據和事實。',
    verbose=True,
    allow_delegation=False
)

writer = Agent(
    role='創意內容作家',
    goal='根據研究結果撰寫清晰、引人入勝的文章',
    backstory='一位經驗豐富的內容創作者，能將複雜資訊轉化為易於理解且具吸引力的文字。',
    verbose=True,
    allow_delegation=False
)

# --- 2. 定義 Task (任務) ---

research_task = Task(
    description=(
        "研究並總結『每日冥想的好處』。需要涵蓋的重點包括：減輕壓力、改善專注力、情緒調節和睡眠品質提升。 "
        "請提供清晰、簡潔的要點列表。"
    ),
    expected_output='關於每日冥想好處的清晰、簡潔的要點列表。',
    agent=researcher
)

write_article_task = Task(
    description=(
        "根據研究員提供的冥想好處要點，撰寫一篇約200字的簡短文章。 "
        "文章風格應具吸引力且易於讀者理解，旨在推廣每日冥想的益處。"
    ),
    expected_output='一篇關於每日冥想好處的簡短、具吸引力的文章。',
    agent=writer
)

# --- 3. 定義 Crew (團隊) ---

crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, write_article_task],
    process=Process.sequential  # 任務順序執行
)

# --- 4. 啟動任務 ---

result = crew.kickoff()

print("######################")
print("最終產出:")
print(result)
