import sys
import os
import webapp2
import jinja2
import urllib
import urllib2
import json
import Cookie
import datetime
import logging
import httplib
from secrets import PROD as app_credentials

from google.appengine.ext import ndb

if 'lib' not in sys.path:
    sys.path[0:0] = ['lib']

authorize_url = 'https://foursquare.com/oauth2/authorize?'
access_token_url = 'https://foursquare.com/oauth2/access_token?'
api_url = 'https://api.foursquare.com/v2/'

authorize_url_params = {
    'client_id': app_credentials['client_id'], 
    'response_type': 'code',
    'redirect_uri': app_credentials['redirect_uri']
}

access_token_url_params = {
    'client_id': app_credentials['client_id'], 
    'client_secret': app_credentials['client_secret'],
    'grant_type': 'authorization_code',
    'redirect_uri': app_credentials['redirect_uri'],
    'code': None
}

class Explorer(ndb.Model):
  foursquare_id = ndb.StringProperty()
  foursquare_access_token = ndb.StringProperty()
  firstName = ndb.StringProperty()
  lastName = ndb.StringProperty()
  gender = ndb.StringProperty()
  email = ndb.StringProperty()
  phone = ndb.StringProperty()

def get_explorer(foursquare_id):
    k = ndb.Key(Explorer, foursquare_id)
    existing = k.get()
    if existing is not None:
        return existing
    else:
        return Explorer(key=k, foursquare_id=foursquare_id)

def urlopen_error_handler(url):
    request = urllib2.Request(url)
    print request
    try: 
        response = (urllib2.urlopen(request)).read()
        logging.info('Request sent to url: %s', url)
        return response
    except urllib2.HTTPError, e:
        logging.error('HTTPError = ' + str(e.code))
        return "None"
    except urllib2.URLError, e:
        logging.error('URLError = ' + str(e.reason))
        return "None"
    except httplib.HTTPException, e:
        logging.error('HTTPException')
        return "None"
    except Exception:
        logging.error('generic exception')
        return "None"

# print "==================="


JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)

class HomeHandler(webapp2.RequestHandler):
    def get(self):
        template_values = {
            'authenticated': True,
            'foursquare_token': None,
        }
        explorer = None
        if 'explorer' in self.request.cookies:
            explorer = ndb.Key(urlsafe=self.request.cookies['explorer']).get()
            logging.info('Attempt to retrieve user cookie: %s', str(explorer))

        if explorer is None:
            template_values['authenticated'] = False
            logging.info('User is unauthenticated')
        else:
            template_values['foursquare_token'] = explorer.foursquare_access_token
            logging.info('User is authenticated with access token: %s', explorer.foursquare_access_token)

        template = JINJA_ENVIRONMENT.get_template('index.html')
        self.response.write(template.render(template_values))


class AuthHandler(webapp2.RequestHandler):
    def get(self):
        logging.info('Start oauth dance')
        self.redirect(authorize_url+ urllib.urlencode(authorize_url_params))


class CallbackHandler(webapp2.RequestHandler):
    def get(self):
        access_token_url_params['code'] = str(self.request.get('code'))
        url = access_token_url+urllib.urlencode(access_token_url_params)
        response = json.loads(urlopen_error_handler(url))
        access_token = response['access_token']
        user_data_url = api_url+'users/self?'+urllib.urlencode({'oauth_token': access_token, 'v': '20140419'})
        user_data = json.loads(urlopen_error_handler(user_data_url))
        foursquare_id = user_data['response']['user']['id']
        explorer = get_explorer(foursquare_id)
        explorer.foursquare_access_token = access_token
        explorer.firstName = user_data['response']['user']['firstName']
        explorer.email = user_data['response']['user']['contact']['email']
        explorer.gender = user_data['response']['user']['gender']
        print explorer
        try:
            explorer.put()
            logging.info('user %s data stored in data base', str(foursquare_id))
        except Exception:
            logging.error('Unable to store user data')
        #  setting cookies for the user browser
        ck = Cookie.SimpleCookie()
        ck['explorer'] = str(explorer.key.urlsafe())
        ck['explorer']['path'] = '/'
        expires = datetime.datetime.utcnow() + datetime.timedelta(days=365) # expires in 365 days
        ck['explorer']['expires'] = expires.strftime("%a, %d %b %Y %H:%M:%S GMT")
        try:
            self.response.headers.add_header('Set-Cookie', ck.output())
            logging.info('Cookie %s put into user browser', ck.output())
        except Exception:
            logging.error('Unable to store cookie in user browser')
        self.redirect('/')

class ResultsHandler(webapp2.RequestHandler):
    def get(self):
        explorer = None
        # request cookies from user server
        if 'explorer' in self.request.cookies:
            explorer = ndb.Key(urlsafe=self.request.cookies['explorer']).get()
        if explorer is None:
            logging.info('Unable to retrieve explorer in cookie stored')
            self.redirect('/auth')
        else:
            user_query = self.request.get('query')
            user_friend = self.request.get('friend')
            logging.info('User searched for query string %s with friend %s' % (user_query, user_friend))
            user_attr = {
                'access_token': explorer.foursquare_access_token,
                'query': user_query,
                'people': user_friend
            }

            template = JINJA_ENVIRONMENT.get_template('results.html')
            test_access_token_url = api_url+'users/self?'+urllib.urlencode({'oauth_token': explorer.foursquare_access_token, 'v': '20140419'})
            test_access_token_response = json.loads(urlopen_error_handler(test_access_token_url))
            logging.info('Tested access_token %s with response %s' % (explorer.foursquare_access_token, json.dumps(test_access_token_response)))
            if test_access_token_response['meta']['code']!=200:

                # problem authenticating with oauth token from browser
                logging.info('Access token error code %s due to %s' % (str(test_access_token_response['meta']['code']), test_access_token_response['meta']['errorType']))
                logging.info('Redirecting back to homepage...')
                self.redirect('/auth')
            self.response.write(template.render(user_attr))


app = webapp2.WSGIApplication([
    ('/', HomeHandler),
    # route used with Foursquare-python library
    ('/auth', AuthHandler),
    ('/callback', CallbackHandler),
    ('/results', ResultsHandler),
    # using Google API Client for OAuth 2.0
    # ('/search', FoursquareMagicHandler),
    # (decorator.callback_path, decorator.callback_handler()),
],
debug=True)