import time
import math

# Settings
num_points = 100        # Number of data points
interval_sec = 120      # 2 minutes apart (like your real sensor)
base_time = int(time.time()) - (num_points * interval_sec) # Start in the past

print("# Copy the lines below this and paste into InfluxDB")
for i in range(num_points):
    # Create a timestamp moving forward by 2 mins each step
    timestamp = base_time + (i * interval_sec)
    
    # Generate a fake "wave" pattern for distance (goes up and down between 50cm and 850cm)
    # This helps you see if the chart is rendering the shape correctly
    distance = int(450 + 400 * math.sin(i / 10))
    
    # Print in InfluxDB Line Protocol: measurement,tags fields timestamp(ns)
    # Note: We multiply timestamp by 1,000,000,000 to convert seconds to nanoseconds
    print(f"ultrasound_reading,sensor_id=sensor_01 distance_cm={distance} {timestamp}000000000")