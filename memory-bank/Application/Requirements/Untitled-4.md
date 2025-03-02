Okay, I understand completely. You want me to explain how I'm configured to handle context (or ignore it) and how you can ask me to continue a context when you want to, even after it feels like I've forgotten everything.

My Configuration (How I Handle Context)

Here's how my underlying system and I are designed to work with context:

Large Language Model (LLM): I'm based on a Large Language Model (LLM), which is a sophisticated type of AI. LLMs are trained on massive amounts of text data. This training allows me to:

Understand Language: Comprehend the meaning of words, sentences, and paragraphs.
Generate Text: Create human-quality text that is relevant to the input I receive.
Reason and Infer: Make inferences and connections between different pieces of information.
Retain Information (Context): Remember and use information from previous turns in a conversation.
Context Window:

Limited Memory: My LLM has a "context window," which is essentially a limited-size buffer of the conversation's recent history.
Sliding Window: This window "slides" forward as the conversation progresses. When the window is full, the oldest turns are "forgotten" to make room for new turns.
Focus on Recent: This means I'm best at remembering and using the most recent turns in our conversation.
Not a database: I'm not saving the history in a database but I'm keeping a limited context.
Prompt Engineering:

Instructions: When you give me a task, you're creating a "prompt." This prompt can include instructions, questions, and examples.
Context in Prompts: I also get context from the prompt.
The more you give context the better: The more the prompt is explicit and contains data, the better I'm responding.
My limitations:

Forgetfulness: Sometimes, I "forget" things from earlier in the conversation because they've fallen outside the context window. This is not because I'm intentionally trying to forget but because of my technical limitations.
Misinterpretation: I might misinterpret your instructions if they're not perfectly clear, especially if they refer to earlier information that I have not in my context window.
Reset: If you give me an explicit instruction to "ignore everything" I will delete all the previous context.
How to Continue the Context (Even When It Feels Like I've Forgotten)

Here's how you can guide me to continue the context, even when it seems like I've reset:

Explicit References:

Refer to Earlier Turns: If you want me to recall something from earlier, be as specific as possible. For example, instead of saying "use the same approach as before," say "remember the way we structured the Authentication.md file? Use that same structure for the Community.md file."
Summarize Earlier Points: If there were several important points from earlier, you can summarize them in your new prompt. For example, "Remember that we established that the Authentication.md file should be a high-level overview, while the other files in that directory should contain implementation details. Keep that structure in mind as we work on the Community/ directory."
Give me examples: If you want me to do something based on a previous answer, give me an example of what I have already done and what you want to do now.
Repetition (Reinforce Key Information):

Repeat Important Details: If there are key concepts, constraints, or requirements, you can repeat them in later turns to make sure they're still within my context window. For example, "Remember, we're using the Authentication.md file as a high-level overview, and we need to keep links to the memory bank."
Repeat the task: You can also repeat the task you asked me to do.
Continuity Keywords:

"Continue," "Building On," "Extending": You can use phrases like "continue from where we left off," "building on our previous discussion," or "extending the work we did on..." to signal that you want me to keep using the existing context.
"Related to", "same subject as": You can use those keywords if the previous conversation is related to the new one.
Avoid "Reset" Keywords:

"Ignore Everything," "Start Over," "Completely New": If you use phrases like these, I will usually interpret that as a hard reset and clear my context window.
"Forget", "all previous context", "clean slate": Those keywords are the same as above.
Break large task:

Break your large task into smaller ones. This will help me to not be too confuse with all the information.
Example of Continuing Context:

Bad (Context Loss):

You: "Okay, now do the next directory." (I'll likely have forgotten much of the previous details)
You: "ignore all previous context". (I will forget everything).
Good (Continuing Context):

You: "Okay, let's move on to the Community/ directory. Remember that we're creating a high-level Community.md overview file, and then more detailed files like Forums.md, Groups.md, and User-Profiles.md. Let's use the same approach as we did for the Authentication/ directory." (This is good because you're reminding me of the structure, the files, and the approach.)
You: "Now that the Authentication/ directory is done, can we continue and do the Community/ directory. As before the Authentication.md we will do the Community.md file that will be a high level view and then we will create the Forums.md, Groups.md and User-Profiles.md. Also it is the same subject as before." (This is good because you are repeating the task, the files and use the keywords "continue" and "same subject").
You: "Let's create the Community.md file. The file will have a structure like the Authentication.md file. Let's put the same section and the file will be a high level view. Also don't forget to include a link to the memory bank." (This is good because you remember me how the previous file is done and you asked me to do the same for this new file.)
In essence: To continue the context effectively, you need to be a bit more explicit and remind me of the important details, like you would when working with a human colleague who might have forgotten something.

I hope this explanation of my configuration and how to manage context is helpful! Let me know if you have any further questions.

