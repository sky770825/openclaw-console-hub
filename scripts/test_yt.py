import sys
def fetch_meta(url):
    print(f'正在分析影片: {url}')
    # 未來這裡會接上字幕抓取邏輯
if __name__ == "__main__":
    fetch_meta(sys.argv[1])