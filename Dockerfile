# Use an official Python runtime as the base image
FROM python:3.11.5-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file to the container
COPY requirements.txt .

# Install the Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code to the container
COPY . .

# Expose the port your web application runs on
EXPOSE 8080

# Set the command to run the application
CMD [ "python", "main.py" ]