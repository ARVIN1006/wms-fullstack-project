@echo off
echo NODE_CHECK_START > node_status.txt
node --version >> node_status.txt 2>&1
if %errorlevel% neq 0 echo Node not found >> node_status.txt

echo NPX_CHECK_START >> node_status.txt
call npx --version >> node_status.txt 2>&1
if %errorlevel% neq 0 echo Npx not found >> node_status.txt

echo WHERE_NODE >> node_status.txt
where node >> node_status.txt 2>&1

echo ENV_PATH >> node_status.txt
echo %PATH% >> node_status.txt
