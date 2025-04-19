@echo off
title GPT sin Alzheimer - Servidor Local
echo Iniciando backend local...
start "" node app/index.js

timeout /t 3 >nul

echo Abriendo túnel seguro con localtunnel...
start "" cmd /k "lt --port 3611 --subdomain gptsinalzheimer"

timeout /t 5 >nul

start https://gptsinalzheimer.loca.lt/openapi.yaml

