from django.urls import path
from .views import ChatGroqStreamView

urlpatterns = [
    path("chat-stream/", ChatGroqStreamView.as_view(), name="chat_stream"),
]
