# Largest Prime Factor of 600851475143

## Problem
Find the largest prime factor of the number 600851475143.

## Solution
A Python script was executed to calculate the largest prime factor.

The script used the following logic:
```python
def largest_prime_factor(n):
    i = 2
    factors = []
    while i * i <= n:
        if n % i:
            i += 1
        else:
            n //= i
            factors.append(i)
    if n > 1:
        factors.append(n)
    return max(factors) if factors else None

# Calculate for the given number
# print(largest_prime_factor(600851475143))
```

## Result
The largest prime factor of 600851475143 is **6857**.
