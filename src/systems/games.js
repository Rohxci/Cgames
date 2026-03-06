const games = {};

module.exports = {

create(channelId,data){
games[channelId] = data;
},

get(channelId){
return games[channelId];
},

delete(channelId){
delete games[channelId];
},

exists(channelId){
return games[channelId] !== undefined;
}

};
