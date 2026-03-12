import csv
import random
from datetime import datetime, timedelta

def generate_data(output_path):
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    
    with open(output_path, 'w', newline='') as csvfile:
        fieldnames = ['date', 'input_tokens', 'output_tokens', 'model']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        current_date = start_date
        while current_date <= end_date:
            writer.writerow({
                'date': current_date.strftime('%Y-%m-%d'),
                'input_tokens': random.randint(50000, 200000),
                'output_tokens': random.randint(20000, 80000),
                'model': 'gpt-4o-equivalent'
            })
            current_date += timedelta(days=1)
    print(f"Data generated at {output_path}")

if __name__ == "__main__":
    import sys
    generate_data(sys.argv[1])
