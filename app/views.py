# built-in
import sys
import pdb
import subprocess
import json

# external
from flask import Flask
import pexpect
import flask
from flask import redirect
from flask import render_template
from flask import Response
from flask import request
from flask import jsonify

# custom
from app import app


bash = pexpect.spawn('/bin/bash',)

@app.route('/')
def index():
    return redirect('/terminal')

@app.route('/terminal')
def terminal():
    return render_template('terminal.html')

@app.route('/stdin', methods=['GET', 'POST'])
def stdin():
    if request.method == 'GET':
        if 'key' in request.args:
            key = request.args['key']
            print(f'Received key: {key}')
            bash.send(key)
            return Response()
    return Response()

@app.route('/command', methods=['GET', 'POST'])
def command():
    if request.method == 'GET':
        if 'command' in request.args:
            command = request.args['command']
            print(f'Received command: {command}')
            bash.sendline(command)
            return jsonify({
                'stdout': bash.read_nonblocking(size=1000, timeout=5).decode(),
            })
    if request.method == 'POST':
        if 'command' in request.form:
            command = request.form['command']
            print(f'Received command: {command}')
    return Response()

@app.route('/read', methods=['GET', 'POST'])
def read():
    if request.method == 'GET':
        stdout = bash.read_nonblocking(size=10000).decode()
        print(f'return: {stdout}, length: {len(stdout)}')
        return jsonify({
            'stdout': stdout,
        })
    return
