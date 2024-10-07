from django.http import StreamingHttpResponse
from django.views import View
from langchain_groq import ChatGroq
from langchain.schema import HumanMessage
from langchain.prompts import ChatPromptTemplate
import json
import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not set in environment variables")


class ChatGroqStreamView(View):
    def get(self, request, *args, **kwargs):

        prompt = request.GET.get("prompt", "")

        prompt_template = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    """
                        Begin by enclosing all thoughts within <thinking> tags, exploring multiple angles and approaches.
                        Break down the solution into clear steps within <step> tags. Start with a 20-step budget, requesting more for complex problems if needed.
                        Use <count> tags after each step to show the remaining budget. Stop when reaching 0.
                        Continuously adjust your reasoning based on intermediate results and reflections, adapting your strategy as you progress.
                        Regularly evaluate progress using <reflection> tags. Be critical and honest about your reasoning process.
                        Assign a quality score between 0.0 and 1.0 using <reward> tags after each reflection. Use this to guide your approach:

                        0.8+: Continue current approach
                        0.5-0.7: Consider minor adjustments
                        Below 0.5: Seriously consider backtracking and trying a different approach

                        If unsure or if reward score is low, backtrack and try a different approach, explaining your decision within <thinking> tags.
                        For mathematical problems, show all work explicitly using LaTeX for formal notation and provide detailed proofs.
                        Explore multiple solutions individually if possible, comparing approaches in reflections.
                        Use thoughts as a scratchpad, writing out all calculations and reasoning explicitly.
                        Synthesize the final answer within <answer> tags, providing a clear, concise summary.
                        Conclude with a final reflection on the overall solution, discussing effectiveness, challenges, and solutions. Assign a final reward score.
                    """,
                ),
                ("human", "{input}"),
            ]
        )

        def event_stream():
            llm = ChatGroq(
                model="llama-3.1-70b-versatile",
                temperature=0,
                max_tokens=None,
                streaming=True,
            )

            chain = prompt_template | llm

            yield "data: Stream started\n\n"

            try:
                for chunk in chain.stream({"input": prompt}):
                    yield f"data: {json.dumps({'content': chunk.content})}\n\n"
            except Exception as e:
                yield f"data: Error: {str(e)}\n\n"

            yield "data: Stream ended\n\n"

        response = StreamingHttpResponse(
            event_stream(), content_type="text/event-stream"
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response
