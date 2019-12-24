# external
from flask import Flask

app = Flask(__name__, instance_relative_config=True)

# load views
from app import views

# load config
app.config.from_object('config')
