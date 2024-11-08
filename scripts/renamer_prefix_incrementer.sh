#!/bin/bash

# Check if an argument is provided
if [ $# -eq 1 ]; then
    echo "Usage: $0 threshold"
    exit 1
fi

threshold=$1
increment=$2

# Loop through files with the pattern "[0-9][0-9]-*"
for file in [0-9][0-9]-*; do
    # Extract the number prefix
    number=$(echo $file | cut -d'-' -f1)
    
    # Check if the file name matches the expected pattern and the number exceeds the threshold
    if [[ $file =~ ^[0-9][0-9]- ]] && [ $number -ge $threshold ]; then
        # Increment the number
        new_number=$(printf "%02d" $((10#$number+$increment)))
        
        # Construct the new file name
        new_name="${new_number}-${file#*-}"
        
        # Rename the file
        mv "$file" "$new_name"
        echo "renamed $file to $new_name"
    fi
done