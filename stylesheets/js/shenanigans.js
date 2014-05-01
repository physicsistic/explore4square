/* GLOBAL Parameters */
var foursquareVersion = "v=20140313";


/* Load a map object centered in San Francisco*/
var mapElement = document.createElement('div');
mapElement.id = 'map';
document.getElementById('results').appendChild(mapElement);
var map = L.mapbox.map('map', 'physicsistic.hi9k1432');

function findPeople(foursquareAccessToken, people, venues){
  function parsePeople(){
    var peopleList = (JSON.parse(this.responseText)).response.friends.items
    var friendID = null;
    for(var i=0; i<peopleList.length; ++i){
      var guessedPeople = peopleList[i];
      var name = people.split(" ");
      if(((guessedPeople.firstName).toLowerCase()==(name[0]).toLowerCase()) && 
        ((guessedPeople.lastName).toLowerCase()==(name[1]).toLowerCase())){
        friendID = guessedPeople.id;
        break;
      }
    }
    for(var i = 0; i < venues.length; ++i) {
      var venue = venues[i];
      loadVenue(foursquareAccessToken, venue, friendID);
    }
  }
  var queryString = "https://api.foursquare.com/v2/users/self/friends?" +
                    foursquareVersion +
                    "&oauth_token=" + foursquareAccessToken
  var rawPeopleRequest = new XMLHttpRequest();
  rawPeopleRequest.onload = parsePeople;
  rawPeopleRequest.open("get", queryString, true);
  rawPeopleRequest.send();
}

function getLocation(foursquareAccessToken, query, people){
  /* Find out who the user is looking for */
  if (navigator.geolocation){
    var options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 300000
    }
    var ll = {
      latitude: 37.7756,
      longitude: -122.4193
    }
    navigator.geolocation.getCurrentPosition(
      function(position) { 
        ll.latitude = position.coords.latitude;
        ll.longitude = position.coords.longitude;
        searchRawVenueData(foursquareAccessToken, query, ll, people);
      }, 
      function(error) {
        searchRawVenueData(foursquareAccessToken, query, ll, people);
      }, 
      options);
    }
}

/* Load venue not yet visited. */
function loadVenue(foursquareToken, venue, friendID) {
  var locationID = venue.venue.id;
  function parseLocationListener(){
    var venueJSON = (JSON.parse(this.responseText)).response.venue;
    var visited = false;
    if(friendID!=null){
      if (venueJSON.friendVisits != undefined) {
        var friendList = venueJSON.friendVisits.items;
        for(var i=0; i<friendList.length; ++i) {
          var friend = friendList[i];
          if(friend.user.id == friendID) {
            visited = true;
            break;
          }
          else{
            visited = false;
          }
        }
      }
    }
    /* If friend never been, display the marker */
    if(visited == false){
      var image_source = venueJSON.photos.groups[0].items[0]
      var popupContent = '<a target="_blank" class="popup" href="' + venueJSON.canonicalUrl + '">' +
                        '<img src="' + image_source.prefix+'width'+image_source.width+image_source.suffix + '" width="200">' +
                        '<h2>' + venueJSON.name + '</h2>' +
                        '</a>' +
                        '<h1>' + venueJSON.rating + '</h1>';
      var venueMarker = L.marker([venueJSON.location.lat, venueJSON.location.lng]).addTo(map).bindPopup(popupContent);
   }
 }

  var oReq = new XMLHttpRequest();
  oReq.onload = parseLocationListener;
  var queryString = "https://api.foursquare.com/v2/venues/"+locationID+"?"+
                    foursquareVersion +
                    "&oauth_token="+foursquareToken;
  oReq.open("get", queryString, true);
  oReq.send();


}

function searchRawVenueData(foursquareToken, query, l, people) {
  map.setView([l.latitude, l.longitude], 15)
  function reqListener () {
    var venues = (JSON.parse(this.responseText)).response.groups[0].items;
    findPeople(foursquareToken, people, venues);
    
  }
  var rawVenueRequest = new XMLHttpRequest();
  rawVenueRequest.onload = reqListener;
  var queryString ="https://api.foursquare.com/v2/venues/explore?" +
                  foursquareVersion +
                  "&ll="+l.latitude+","+l.longitude +
                  "&query="+encodeURI(query) +
                  "&limit=50" +
                  "&openNow=1" +
                  "&oauth_token="+foursquareToken;
  rawVenueRequest.open("get", queryString, true);
  rawVenueRequest.send();
  /* set user current location*/
  L.circleMarker([l.latitude,l.longitude]).addTo(map);

}
  