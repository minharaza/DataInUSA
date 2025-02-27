import pandas as pd

# Load the dataset
df = pd.read_csv('national_health_data_2024.csv')

# Inspect the first few rows
print(df.head())

# Convert columns to numeric if needed (example for poverty_perc)
df['poverty_perc'] = pd.to_numeric(df['poverty_perc'], errors='coerce')

# Handle missing values - drop rows with missing values in key columns
df_clean = df.dropna(subset=['poverty_perc', 'median_household_income'])

# Save the preprocessed data with ALL columns for later use in d3
df_clean.to_csv('preprocessed_national_health_data.csv', index=False)
