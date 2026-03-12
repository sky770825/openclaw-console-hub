import pandas as pd

# Raw URL for the example CSV file
csv_url = 'https://raw.githubusercontent.com/wesm/pydata-book/2nd-edition/examples/ex6.csv'

# Read the CSV file into a pandas DataFrame
df = pd.read_csv(csv_url)

# Perform basic analysis and print the results
print("First 5 rows of the DataFrame:")
print(df.head())

print("\nDescriptive statistics of the DataFrame:")
print(df.describe())
