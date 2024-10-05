import os
from transformers import pipeline
from datetime import datetime

# Load your local fine-tuned model on GPU (if available)
asr_model = pipeline('automatic-speech-recognition', model="D:/AiML/dataset/Finetuned")

def save_temporary_file(audio_file_stream, format="aac"):
    """Save the audio file stream as a temporary file."""
    # Use the current timestamp as the filename
    current_time = datetime.now().strftime("%Y%m%d-%H%M%S")
    temp_file = f"./data/temp_audio_file_{current_time}.{format}"
    audio_file_stream.save(temp_file)
    return temp_file

def transcribe(audio_file_stream):
    """
    Transcribe an audio file stream using the fine-tuned Whisper model.
    The model will handle audio format internally, leveraging ffmpeg for reading and resampling.
    """
    # Save AAC file temporarily
    file_path = save_temporary_file(audio_file_stream)
    
    # Use the fine-tuned Whisper model to transcribe the audio file directly
    transcription = asr_model(file_path)
    
    # Delete the temporary file
    os.remove(file_path)
    
    # Return the transcription text
    return transcription['text']

def save_transcription(text):
    """Save the transcription text as a .txt file."""
    current_time = datetime.now().strftime("%Y%m%d-%H%M%S")
    filename = f"./data/{current_time}.txt"
    
    with open(filename, 'w', encoding='utf-8') as file:
        file.write(text)
    
    print(f"Transcription saved to {filename}")

# Example usage:
# Assuming `audio_file_stream` is the audio file you are uploading through a form in the web app
# transcription_text = transcribe(audio_file_stream)
# save_transcription(transcription_text)
