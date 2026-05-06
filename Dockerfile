FROM python:3.9-slim

# Set the working directory
WORKDIR /code

# Copy the requirements file
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Hugging Face Spaces requires apps to run on port 7860
EXPOSE 7860

# Create the uploads folder (since it is ignored by gitignore)
RUN mkdir -p static/uploads

# Start the Flask app using the built-in server on port 7860 to avoid Gunicorn multiprocessing crashes
CMD ["python", "app.py"]
