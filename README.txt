LOVE TESTER - ONE UPLOAD NETLIFY VERSION

This version is designed for easy deployment on Netlify. It has:
- Public Love Tester website
- Shared results from every visitor
- Password-protected admin dashboard
- Persistent Netlify Blobs storage
- Server-side score calculation
- CSV export and clear-results controls

DEFAULT ADMIN PASSWORD
Hamza123

EASY DEPLOY
1. Create/log in to a Netlify account.
2. Open https://app.netlify.com/drop
3. Unzip this project.
4. Drag the entire project folder into Netlify Drop.
5. Open the generated public URL.
6. Click Admin Dashboard and enter Hamza123.

SECURITY
For a real public site, change the admin password in Netlify:
Project configuration -> Environment variables -> add ADMIN_PASSWORD.
Also add SESSION_SECRET to a long random value.
After changing environment variables, redeploy the site.

The website does not collect IP addresses or other visitor tracking data. It stores the two names submitted, the calculated score, tier, and timestamp so the admin can analyze usage.

The score is a fun compatibility score, not a scientific measurement of love. The server calculates it symmetrically so A+B and B+A always receive the same score and visitors cannot submit their own fake percentage.
