# Welcome to your Future Cast project

## Project info

**URL**: https://lovable.dev/projects/dccdd68b-5ef5-4eda-ac48-76d6c6c54f8e

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/dccdd68b-5ef5-4eda-ac48-76d6c6c54f8e) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Backend & Database)
- Resend (Email Service)

## Contact Form Functionality

The application includes a contact form that allows users to send messages to support@futurecast.pro. The contact form features:

- **Form Validation**: All fields (name, email, subject, message) are required
- **Email Notifications**:
  - Sends the contact form submission to support@futurecast.pro
  - Sends a confirmation email to the user
- **Professional Design**: Matches the FutureCast branding with responsive layout
- **Error Handling**: Proper error messages and loading states
- **Accessibility**: Proper form labels and ARIA attributes

### Contact Form Route

- **URL**: `/contact`
- **Component**: `src/pages/Contact.tsx`
- **Backend Function**: `supabase/functions/send-contact-email/index.ts`

### Email Configuration

The contact form uses Resend for email delivery. The following environment variables are required:

- `RESEND_API_KEY`: API key for Resend email service

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/dccdd68b-5ef5-4eda-ac48-76d6c6c54f8e) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)
