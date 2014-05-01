/* GLOBAL Parameters */
var foursquareVersion = "v=20140313";

function parseName(firstName, lastName){
	if(lastName==undefined){
		return firstName
	}
	else if(firstName==undefined){
		return lastName
	}
	else{
		return firstName+' '+lastName
	}
}

function findFriend(foursquareToken){
	function reqListener () {
    	var friendsRaw = (JSON.parse(this.responseText)).response.friends.items;
    	var friends = [];
    	for(var i = 0; i <friendsRaw.length; ++i){
    		friends.push(parseName(friendsRaw[i].firstName, friendsRaw[i].lastName));
    	}
    	console.log(friends);
    	$( "#friend" ).autocomplete({source: friends});
    
  	}
	var rawVenueRequest = new XMLHttpRequest();
	rawVenueRequest.onload = reqListener;
	var queryString ="https://api.foursquare.com/v2/users/self/friends?" +
                  foursquareVersion +
                  "&oauth_token="+foursquareToken;
  	console.log(queryString);
  	rawVenueRequest.open("get", queryString, true);
  	rawVenueRequest.send();
}