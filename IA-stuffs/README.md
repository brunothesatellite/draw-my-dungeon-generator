Utilisation de Ollama / qwen2.5vl:7b

python -m venv .venv
.venv\Scripts\activate.bat
pip install opencv-python
pip install pillow numpy pandas
pip install scikit-image

Télécharge : Ollama Windows
ollama --version
ollama pull qwen2.5vl:7b
ollama run qwen2.5vl:7b

pip install ollama
