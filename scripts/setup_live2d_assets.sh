#!/bin/bash
# Helper script to setup Live2D asset structure in the public directory
PUBLIC_DIR="./public"
TARGET_DIR="$PUBLIC_DIR/assets/live2d"

if [ ! -d "$PUBLIC_DIR" ]; then
    echo "Error: public directory not found. Please run this script from the project root."
    exit 1
fi

mkdir -p "$TARGET_DIR"
echo "Live2D directory created at $TARGET_DIR"
echo "Please place your model folders (containing .model3.json) here."
