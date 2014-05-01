import foursquare

# Construct the client object
client = foursquare.Foursquare(client_id='2EXJ01AGMR4S3M2GLUZ4DTYXQ3XKLTLDPX03KYQIXVAV5KAH', client_secret='JOW1B4LEACF4UYDZDPOBNJRHZJ4GKTJAZ0G5NRCGJ204DBZB', redirect_uri='http://localhost:8080/callback')

# Build the authorization url for your app
auth_uri = client.oauth.auth_url()

print auth_uri

# Interrogate foursquare's servers to get the user's access_token
access_token = client.oauth.get_token('XX_CODE_RETURNED_IN_REDIRECT_XX')

# Apply the returned access token to the client
client.set_access_token(access_token)

# Get the user's data
user = client.users()

print user
