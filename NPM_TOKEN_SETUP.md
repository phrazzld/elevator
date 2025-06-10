# NPM_TOKEN Setup Guide

This guide walks you through configuring the NPM_TOKEN secret required for automated package publishing.

## Step 1: Generate NPM Automation Token

1. **Log in to npm**:

   - Visit [npmjs.com](https://www.npmjs.com)
   - Sign in with your npm account (create one if needed)

2. **Navigate to Access Tokens**:

   - Click your profile icon (top right)
   - Select "Access Tokens" from the dropdown

3. **Create New Token**:

   - Click "Generate New Token"
   - Select **"Automation"** token type (not "Publish")
   - Set token name: `prompt-elevator-github-actions`
   - **Scope**: Select "Read and write" for the `prompt-elevator` package
   - Click "Generate Token"

4. **Copy Token**:
   - **IMPORTANT**: Copy the token immediately (it won't be shown again)
   - Store it securely for the next step

## Step 2: Add GitHub Repository Secret

1. **Navigate to Repository Settings**:

   - Go to your GitHub repository: `https://github.com/phaedrus/elevator`
   - Click "Settings" tab (top menu)

2. **Access Secrets**:

   - In left sidebar, click "Secrets and variables"
   - Select "Actions"

3. **Add Secret**:
   - Click "New repository secret"
   - **Name**: `NPM_TOKEN`
   - **Secret**: Paste the npm token from Step 1
   - Click "Add secret"

## Step 3: Verification

1. **Confirm Secret Added**:

   - The `NPM_TOKEN` should appear in the repository secrets list
   - You should see "NPM_TOKEN" with a green checkmark

2. **Security Notes**:
   - Never commit this token to your repository
   - The token is scoped specifically to the `prompt-elevator` package
   - GitHub Actions will use this token for automated publishing

## Troubleshooting

- **Token not working**: Ensure you selected "Automation" type, not "Publish"
- **Permission denied**: Verify the token has "Read and write" scope for your package
- **Secret not visible**: GitHub secrets are write-only - you can't view them after creation

## Next Steps

Once this is complete:

- Mark T005 as complete in TODO.md
- Proceed with T006 (GitHub Actions workflow creation)
