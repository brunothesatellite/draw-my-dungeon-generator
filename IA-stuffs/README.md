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

Générer avec Vision & Description
analyser.bat 202

Retravailler les tuiles pour éliminer les hhalucinations en conservant sourceFeatures (pas de nouvel appel à la Vision)
"D:\draw-my-dungeon-generator\.venv\Scripts\python.exe" regenerer_descriptions.py --start 1 --end 460 --delay 2
