# built-in
import sys

# external
from flask import Flask

# custom


app = Flask(__name__)


@app.route('/')
def terminal():
    return 'Hello'
