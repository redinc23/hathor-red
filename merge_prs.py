import requests
import os
import sys

# Configuration
# It is highly recommended to set the GITHUB_TOKEN environment variable
# instead of hardcoding the token here for security reasons.
ACCESS_TOKEN = os.environ.get("GITHUB_TOKEN") or "your_personal_access_token"
OWNER = "redinc23"
REPO = "hathor-red"
BASE_URL = "https://api.github.com"

# Headers for authentication
HEADERS = {
    "Authorization": f"token {ACCESS_TOKEN}",
    "Accept": "application/vnd.github+json"
}

def get_open_prs(owner, repo):
    """Fetch all open pull requests with pagination handling."""
    open_prs = []
    url = f"{BASE_URL}/repos/{owner}/{repo}/pulls?state=open&per_page=100"

    while url:
        response = requests.get(url, headers=HEADERS)
        if response.status_code != 200:
            raise Exception(f"Error fetching pull requests: {response.status_code}, {response.text}")

        open_prs.extend(response.json())

        # Check if there is a 'next' page in the Link header
        if 'next' in response.links:
            url = response.links['next']['url']
        else:
            url = None

    return open_prs

def force_merge_pr(owner, repo, pr_number):
    """Force merge a pull request."""
    url = f"{BASE_URL}/repos/{owner}/{repo}/pulls/{pr_number}/merge"
    data = {
        "commit_title": f"Force merging PR #{pr_number}",
        "merge_method": "merge"
    }
    response = requests.put(url, headers=HEADERS, json=data)

    if response.status_code == 200:
        print(f"PR #{pr_number} merged successfully.")
    elif response.status_code == 405:
        # 405 Method Not Allowed is returned when the PR is not mergeable (conflicts, draft, etc.)
        error_msg = response.json().get('message', 'Unknown error')
        print(f"Failed to merge PR #{pr_number}: {error_msg}")
    else:
        print(f"Failed to merge PR #{pr_number}: {response.status_code}, {response.text}")

def main():
    if not ACCESS_TOKEN or ACCESS_TOKEN == "your_personal_access_token":
        print("Error: GITHUB_TOKEN environment variable not set.")
        sys.exit(1)

    try:
        open_prs = get_open_prs(OWNER, REPO)

        if not open_prs:
            print("No open pull requests found!")
            return

        print(f"Found {len(open_prs)} open pull requests.")
        for pr in open_prs:
            pr_number = pr["number"]
            print(f"Attempting to merge PR #{pr_number}")
            force_merge_pr(OWNER, REPO, pr_number)
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
