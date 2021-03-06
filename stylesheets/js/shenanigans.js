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
    console.log(friendID);
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
      var image_source = venueJSON.photos.groups[0].items[0];
      function getDescriptionString(){
        if(venueJSON.description != undefined){
          return venueJSON.description
        }
        else{
          return venueJSON.phrases[0].phrase + ' &#183 ' + venueJSON.phrases[1].phrase + ' &#183 ' + venueJSON.phrases[2].phrase
        }
      }
      var s = '<a href="'+ venueJSON.canonicalUrl +'" class="list-group-item">'+
                '<div class="media">'+
                  '<img class= "pull-left" src="'+ image_source.prefix+'width'+image_source.width+image_source.suffix +'" width="128" height="128">' +
                  '<div class="media-body">'+
                    '<h3 class="media-heading">'+ venueJSON.name + '</h3>' +
                    '<h4><span class="label label-info">'+venueJSON.rating+'</span> <span class="label label-warning">'+ Array(venueJSON.price.tier+1).join("S") +'</span></h4>' +
                    '<p class="media-text">' + getDescriptionString() + '</p>' +
                  '</div>'+
                '</div>'+
              '</a>';
      var div = document.createElement('div');
      div.innerHTML = s;
      var newLocation = div.firstChild;
      newLocation.onmouseover = showPopUp;

      var listedResults = document.getElementById('listed-results');
      listedResults.appendChild(newLocation);
      console.log(venueJSON);
      
      var popupContent ='<a class="popup media" href="' + venueJSON.canonicalUrl + '">' +
                          '<div class="media">'+
                            '<div class="media-body">'+
                              '<h4 class="media-heading">' + venueJSON.name  +'</h4>' +
                            '</div>'+
                            '<img src="' + image_source.prefix+'width'+image_source.width+image_source.suffix + '" width="128" height="128"></a>' +
                          '</div>'+
                        '</a>';
      var venueMarker = L.marker([venueJSON.location.lat, venueJSON.location.lng]).addTo(map).bindPopup(popupContent);
      function showPopUp(){
        venueMarker.openPopup();
      };
   }
 }

  var oReq = new XMLHttpRequest();
  oReq.onload = parseLocationListener;
  var queryString = "https://api.foursquare.com/v2/venues/"+locationID+"?"+
                    foursquareVersion +
                    "&oauth_token="+foursquareToken;

  console.log(queryString);
  oReq.open("get", queryString, true);
  oReq.send();


}

function searchRawVenueData(foursquareToken, query, l, people) {
  console.log(people);
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
                  '&novelty=new'+
                  "&query="+encodeURI(query) +
                  "&limit=10" +
                  "&openNow=1" +
                  "&oauth_token="+foursquareToken;
  rawVenueRequest.open("get", queryString, true);
  rawVenueRequest.send();
  /* set user current location*/
  L.circleMarker([l.latitude,l.longitude]).addTo(map);

}
  