from playwright.sync_api import sync_playwright
import requests

def solve_captcha(question):
        print(f'Solving captcha: {question}')
        # Call Ollama API
        response = requests.post('http://localhost:11434/api/chat',
            json={
                "model": "llama3.2:latest",
                "stream": False,
                "messages": [
                    {
                        "role": "user",
                        "content": f'{question} - answer as short as you can, only year, if able'
                    }
                ]
            }
        )
        # print(f'Ollama status code: {response.status_code}')
        data = response.json()
        print(f'Ollama response: {data['message']['content']}')
        return data['message']['content']

def login_with_captcha():
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True  # set to True in production
            )
            page = browser.new_page()
            page.goto('https://xyz.ag3nts.org/')

            # Wait for the captcha question to load
            captcha_question = page.locator('#human-question').text_content().strip()
            
            # Remove "Question:" prefix if present
            captcha_question = captcha_question.replace('Question:', '').strip()

            # Get answer from Ollama
            answer = solve_captcha(captcha_question)
            
            if not answer:
                raise Exception('Failed to get answer from Ollama')

            # Fill in the login form
            page.fill('input[name="username"]', 'tester')
            page.fill('input[name="password"]', '574e112a')
            page.fill('input[name="answer"]', answer)

            # Submit
            browser.close()
    except Exception as error:
        print('Error logging in:', error)

if __name__ == '__main__':
    login_with_captcha() 