import json
import os

def generate_html(data_file, output_file):
    with open(data_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Simple aggregation for Charts
    service_counts = {}
    revenue_by_source = {}
    for entry in data:
        s = entry['service']
        service_counts[s] = service_counts.get(s, 0) + 1
        src = entry['source']
        revenue_by_source[src] = revenue_by_source.get(src, 0) + entry['price']

    html_template = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>美業數據追蹤儀表板</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            body {{ font-family: sans-serif; margin: 20px; background: #f4f7f6; }}
            .container {{ display: flex; flex-wrap: wrap; gap: 20px; }}
            .card {{ background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); flex: 1; min-width: 400px; }}
            h1 {{ color: #333; }}
        </style>
    </head>
    <body>
        <h1>美業營運決策支援儀表板 (Demo)</h1>
        <div class="container">
            <div class="card">
                <h3>熱門服務項目分布</h3>
                <canvas id="serviceChart"></canvas>
            </div>
            <div class="card">
                <h3>各通路營收貢獻</h3>
                <canvas id="sourceChart"></canvas>
            </div>
        </div>

        <script>
            const serviceData = {json.dumps(list(service_counts.values()))};
            const serviceLabels = {json.dumps(list(service_counts.keys()))};
            
            new Chart(document.getElementById('serviceChart'), {{
                type: 'pie',
                data: {{
                    labels: serviceLabels,
                    datasets: [{{ data: serviceData, backgroundColor: ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#4bc0c0'] }}]
                }}
            }});

            const sourceData = {json.dumps(list(revenue_by_source.values()))};
            const sourceLabels = {json.dumps(list(revenue_by_source.keys()))};

            new Chart(document.getElementById('sourceChart'), {{
                type: 'bar',
                data: {{
                    labels: sourceLabels,
                    datasets: [{{ label: '營收 (TWD)', data: sourceData, backgroundColor: '#36a2eb' }}]
                }}
            }});
        </script>
    </body>
    </html>
    """
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_template)

if __name__ == "__main__":
    generate_html("beauty_data.json", "dashboard.html")
