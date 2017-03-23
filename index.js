var firebase = require('firebase');
var Discord = require('discord.js');
var client = new Discord.Client();
var data = require('./data.json');
var version = "0.4"

//DARKBOT
// var token = 'MjYyNDU1MDQ2ODYyNjY3Nzc2.C0DzFA.Zilj0g89_JdrKLSC-n1n6swtx2E';

//ACTUAL
var token = 'MjkyNzg5NTg4Mzk5NzUxMTY4.C69JSw.ui5P_WMd0VcxhIy1SIffXg8lmiQ'
client.login(token);

var config = {
    apiKey: "AIzaSyC5YrnDp73qTJ6jUve5ll7kkvo1fScwqrg",
    authDomain: "r-s-c-d85f7.firebaseapp.com",
    databaseURL: "https://r-s-c-d85f7.firebaseio.com",
    storageBucket: "r-s-c-d85f7.appspot.com"
};
firebase.initializeApp(config);
var database = firebase.database().ref("ML");
var duels = []
var trades = []

function givePlayer(player,item){
	player.inventory.push(item)
	updatePlayer(player,function(){})
}

function printProfile(player){
	var finalMessage = ""
	finalMessage += "__**"+ player.name.capitalize() + "**__\n"
	finalMessage += "```"
	finalMessage += "Health: " + player.health + "/" + player.max_health + " \n"
	finalMessage += "Level: " + player.level + " \n"
	finalMessage += "Gold: " + player.gold + " \n"
	finalMessage += "Exp: " + player.exp + "/" + player.capExp + " \n"
	finalMessage += "Elo: " + player.elo + " \n"
	if(player.ranked_loses != 0){
	finalMessage += "Ranked W/L Ratio: " + player.ranked_wins / player.ranked_loses + " \n"
	} else {
	finalMessage += "Ranked W/L Ratio: This player is currently undefeated in ranked matches. \n"
	}
	finalMessage += "Weapon: " + player.weapon.name + " - Lvl " + player.weapon.level + " \n"
	finalMessage += "Server of Birth: " + player.origin_server + " \n"
	finalMessage += "Date of Birth: " + player.start_time.toLocaleString().replace(",","") + " \n"
	finalMessage += "```"
	return finalMessage
}

function printWeapon(weapon){
	var finalMessage = ""
	finalMessage += "__**"+ weapon.name.capitalize() + " - #" + weapon.id +"**__\n"
	finalMessage += "```"
	finalMessage += "Type: " + weapon.type + " \n"
	finalMessage += "Upgrade Cost: " + weapon.goldToUpgrade + " / " + weapon.goldToUpgrade*2 + " / " + weapon.goldToUpgrade*4 + "\n"
	finalMessage += "Effect: " + weapon.effectName + " \n"
	finalMessage += "\nDamage Values \n"
	for (var i =  0; i < weapon.moveDamage.length; i++) {
		var move = weapon.moveDamage[i]
		finalMessage += "Level " + (i+1) +": Rush Damage: " + move["0"] + "	 Strike Damage: " + move["1"] + "	 Counter Damage: " + move["2"] + " \n"
	}
	finalMessage += "```"
	return finalMessage
}

function printEffect(effect){
	var finalMessage = ""
	finalMessage += "__**"+ effect.name.capitalize() + " - #" + effect.id +"**__\n"
	finalMessage += "```"
	finalMessage += effect.effectDescription + " \n"
	finalMessage += "```"
	return finalMessage
}

function printCombo(combo){
	var finalMessage = ""
	finalMessage += "__**"+ combo.name.capitalize() + " - #" + combo.id +"**__\n"
	finalMessage += "```"
	finalMessage += combo.description + " \n \n"
	finalMessage += "Recipe: " + combo.recipe_string + " \n"
	finalMessage += "```"
	return finalMessage
}

function printInventory(inventory,page){
	var message = "```"
	var entries = 0
	if(inventory != undefined){
		if ((inventory.length - 1) >= (10 * (page - 1))){
				for (var i = inventory.length - (1 + (10 * (page - 1))); i >= 0; i--) {
				message += "Slot #" + parseInt(i+1) + ": " + inventory[i].name + " x" + inventory[i].count + " \n"  
				entries += 1
				if (entries >= 10 || i == 0) {
					message += "```"	
					return message
				}
			}
		} else {
		message += "No items found in this players inventory page"
		message += "```"	
		return message
		}
	} else {
		message += "No items found in this players inventory"
		message += "```"	
		return message
	}
}

var choiceTemplate = [
	{
		chance:33.33,
		id:"0",
		name:"rushed"		
	},{
		chance:33.33,
		id:"1",
		name:"struck"	
	},{
		chance:33.33,
		id:"2",
		name:"countered"
	}
]

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

Array.prototype.random = function() {
    return this[Math.floor(Math.random() * (this.length))]
}

function getDrop(drop){
	for (var i = data.creatureDrops.length - 1; i >= 0; i--) {
		if(data.creatureDrops[i].name == drop){
			return data.creatureDrops[i]
		}
	}
}

function rollDrops(enemy){
	var sum = 0
	var drops = []
	for (var i = enemy.drops.length - 1; i >= 0; i--) {
		var dropData = getDrop(enemy.drops[i])
		sum += dropData.chance
		drops.push(dropData)
	}
	if((100 - sum) < 100) {
		drops.push({
			name:"nothing",
			chance:100 - sum
		})
	}
	return weightedRandom(drops)
}

function weightedRandom(options){
	var chances = [];
	for (var i = options.length - 1; i >= 0; i--) {
		var percent = parseInt(options[i].chance);
		if(i != options.length - 1){
			percent += chances[chances.length - 1];
		}
		chances.push(percent)
	};
	var roll = Math.random() * chances[chances.length -1]
	for (var x = chances.length - 1; x >= 0; x--) {
		if(x == 0){
			if(roll < chances[x]){
				return options.reverse()[x]
			}
		} else {
			if(roll <= chances[x] && roll > chances[x - 1]){
				return options.reverse()[x]
			}
		}
	};
}

function equalizeChance(choices){
	var sum = 0;
	for (var i = choices.length - 1; i >= 0; i--) {
		sum += choices[i].chance
	}
	var modifier = (100 - sum)/choices.length;
	for (var i = choices.length - 1; i >= 0; i--) {
		choices[i].chance += modifier
	}
	return choices
}

function findDuel(message,callback){
	var duel;
	for (var i = duels.length - 1; i >= 0; i--) {
		if(duels[i].type == "bot"){
			if(!message.fake){	
				if(message.author.id == duels[i].player1.player.id){
					duel = duels[i]
				}
			} else {
				if(message.author.id == duels[i].player1.player.id){
					duel = duels[i]
				}
			}
		}
		if(duels[i].type == "player"){
			if(!message.fake){
				if(message.author.id == duels[i].player1.player.id || message.author.id == duels[i].player2.player.id){
					duel = duels[i]
				}
			} else {
				if(message.id == duels[i].player1.player.id){
					duel = duels[i]
				}
			}
		}
	}
	callback(duel)
}

function findTrade(message,callback){
	var trade;
	for (var i = trades.length - 1; i >= 0; i--) {
		if(!message.fake){
			if(message.author.id == trades[i].player1.player.id || message.author.id == trades[i].player2.player.id){
				trade = trades[i]
			}
		} else {
			if(message.id == trades[i].player1.player.id){
				trade = trades[i]
			}
		}
	}
	callback(trade)
}

function getPlayer(id,callback){
	var player_data = firebase.database().ref("players/" + String(id));
	var player;
	player_data.once('value').then(function(snapshot) {
			player = snapshot.val()
			callback(player)
	});
}

function updatePlayer(player,callback){
	var player_data = firebase.database().ref("players/" + String(player.id));
	player_data.update(player);
	callback(player)
}

function removePlayer(player,callback){
	var player_data = firebase.database().ref("players/");
	player_data.once('value').then(function(snapshot) {
		snapshot.forEach(function(child) {
			if(child.val().id == player.id){
		        child.ref.remove();
		        callback(player)
	    	}
	    });
	});
}

function playerDBRefresh(playerid){
	getPlayer(playerid,function(player){
			console.log("updating " + player.name + "...")
			var player_data = firebase.database().ref("players/" + String(player.id));
			var inventory = []
			if(player.inventory != undefined){
				inventory = player.inventory
			}
			var newPlayer = {
				name:player.name,
				id:player.id,
				strength:[],
				mention:player.mention,
				last_seen:player.last_seen,
				searching_for_duel:false,
				searching_type:"casual",
				elo:player.elo,
				ranked_wins:player.ranked_wins,
				ranked_loses:player.ranked_loses,
				casual_wins:player.casual_wins,
				origin_server:player.origin_server,
				start_time:player.start_time,
				combos:[],
				inventory:inventory,
				threat:player.threat,
				threatIncrement:player.threatIncrement,
				monsters_slain:player.monsters_slain,
				health:player.health,
				max_health:player.max_health,
				weapon:player.weapon,
				capExp:player.capExp,
				exp:player.exp,
				gold:player.gold,
				level:player.level
			}
			player_data.update(newPlayer);
	})
}

function createPlayer(message,callback){
	var player_data = firebase.database().ref("players/" + String(message.author.id));
	var weaponinfo = data.weapons.random()
	var weapon = {
		name:weaponinfo.name,
		level:1
	}
	var name;
	if (message.member.nickname == null) {
		name = message.author.username
	} else {
		name = message.member.nickname
	}
	var player = {
		name:name,
		id:message.author.id,
		mention:message.author.toString(),
		last_seen:message.guild.name,
		searching_for_duel:false,
		searching_type:"casual",
		elo:1000,
		ranked_wins:0,
		ranked_loses:0,
		casual_wins:0,
		origin_server:message.guild.name,
		start_time:new Date(),
		combos:[],
		inventory:[],
		threat:0,
		threatIncrement:1,
		monsters_slain:0,
		health:100,
		max_health:100,
		weapon:weapon,
		capExp:50,
		exp:0,
		gold:0,
		level:1
	}
	player_data.update(player);
	callback(player)
}

class Trade{
	constructor(message,player1,player2){
		this.player1 = {}
		this.player2 = {}
		this.player1.player = player1
		this.player2.player = player2
		this.players = [this.player1,this.player2]
		for (var i = this.players.length - 1; i >= 0; i--) {
			this.players[i].offer;
			this.players[i].selectedItemIndex
			this.players[i].confirm;
			if (this.players[i].player.inventory == undefined) {
				this.players[i].player.inventory = []
			}
			
		}
		this.started = false
		var finalMessage = "```"
		finalMessage += "You have invited " + player2.name + " to a trade! \n"
		finalMessage += "Type *!tdecline to decline \n"
		finalMessage += "```"
		this.wumbo(this.player1.player,finalMessage)
		finalMessage = "```"
		finalMessage += "You have been invited to a trade by " + player1.name + "! \n"
		finalMessage += "Type *!taccept to accept \n" 
		finalMessage += "Type *!tdecline to decline \n"
		finalMessage += "```"
		this.wumbo(this.player2.player,finalMessage)
	}
		wumbo(player,message){
			var saved_message
			client.fetchUser(String(player.id)).then(user => 
				user.createDM().then(dm => {
							dm.sendMessage(message).then(message => {
								// message.delete(15000)
							})
						}
					)
				)
		}

		confirm(player){
			if(player.id == this.player1.player.id){
				this.dmPlayers(this.player1.player.name + " accepts the trade")
				this.player1.confirm = true
			}
			if(player.id == this.player2.player.id){
				this.dmPlayers(this.player2.player.name + " accepts the trade")
				this.player2.confirm = true
			}
			if(this.player1.confirm && this.player2.confirm){
				this.processTrade()
			}
		}

		update(player,item,index){
			if(player.id == this.player1.player.id){
				this.dmPlayers(this.player1.player.name + " has offered " + item.name)
				this.player1.offer = item
				this.player1.selectedItemIndex = index
				for (var i = this.players.length - 1; i >= 0; i--) {
					this.players[i].confirm = false
				}
			}
			if(player.id == this.player2.player.id){
				this.dmPlayers(this.player2.player.name + " has offered " + item.name)
				this.player2.offer = item
				this.player2.selectedItemIndex = index
				for (var i = this.players.length - 1; i >= 0; i--) {
					this.players[i].confirm = false
				}
			}
		}

		dmPlayers(message){
				this.wumbo(this.player1.player,message)
				this.wumbo(this.player2.player,message)
		}

		start(){
			var finalMessage = ""
			finalMessage += "```"
			finalMessage += "The trade between " + this.player1.player.name + " and " + this.player2.player.name + " has started! \n" 
			finalMessage += "```"
			finalMessage += "** How to trade ** \n"
			finalMessage += "```"
			finalMessage += "Usage: *!offer (inventory index) \n"
			finalMessage += "Example_1: *!offer 1 \n"
			finalMessage += "Type *!confirm to confirm trade offers \n" 
			finalMessage += "```"
			this.dmPlayers(finalMessage)
			this.started = true;
		}

		end(player){
			var finalMessage = "```"
			finalMessage += player.name + " declined the trade request. \n"
			finalMessage += "```"
			this.dmPlayers(finalMessage)
			trades.splice(trades.indexOf(this),1)
		}

		processTrade(){
			if(this.player2.offer != undefined){
				var itemsName = []
				for (var i = this.player1.player.inventory.length - 1; i >= 0; i--) {
					itemsName.push(this.player1.player.inventory[i].name)
				}
				if(itemsName.reverse().indexOf(this.player2.offer.name) != -1){
					this.player1.player.inventory[itemsName.reverse().indexOf(this.player2.offer.name)].count += this.player2.offer.count
				} else {
					this.player1.player.inventory.push(this.player2.offer)
				}
				if (this.player2.offer.count == this.player2.player.inventory[this.player2.selectedItemIndex - 1].count) {
				this.player2.player.inventory.splice(this.player2.selectedItemIndex - 1,1)
				} else {
					this.player2.player.inventory[this.player2.selectedItemIndex - 1].count -= this.player2.offer.count
				}
			}
			if(this.player1.offer != undefined){
				var itemsName = []
				for (var i = this.player2.player.inventory.length - 1; i >= 0; i--) {
					itemsName.push(this.player2.player.inventory[i].name)
				}
				if(itemsName.reverse().indexOf(this.player1.offer.name) != -1){
					this.player2.player.inventory[itemsName.reverse().indexOf(this.player1.offer.name)].count += this.player21.offer.count
				} else {
					this.player2.player.inventory.push(this.player1.offer)
				}
				if (this.player1.offer.count == this.player1.player.inventory[this.player1.selectedItemIndex - 1].count) {
				this.player1.player.inventory.splice(this.player1.selectedItemIndex - 1,1)
				} else {
					this.player1.player.inventory[this.player1.selectedItemIndex - 1].count -= this.player1.offer.count
				}
			}
			var p1 = this.player1
			var p2 = this.player2	
			var trade = this
			updatePlayer(p1.player,function(){
				updatePlayer(p2.player,function(){
					trade.dmPlayers("Trade successful")
					trades.splice(trades.indexOf(trade),1)
				})
			})
		}
	}
class Duel {
	constructor(message,player1,player2,rating,expReward,gold_reward,type){
		this.player1 = {};
		this.player2 = {};
		this.player1.player = player1;
		this.player2.player = player2;
		this.player1.preHealth = player1.health;
		this.player2.preHealth = player2.health;
		this.players = [this.player1,this.player2]
		for (var i = this.players.length - 1; i >= 0; i--) {
			for (var y = data.weapons.length - 1; y >= 0; y--) {
				if(data.weapons[y].name == this.players[i].player.weapon.name){
					this.players[i].weapon = data.weapons[y]
				}
			}
			for (var x = data.effects.length - 1; x >= 0; x--) {
				if(data.effects[x].name == this.players[i].weapon.effectName){
					this.players[i].weapon.effect = data.effects[x]
				}
			}
			this.players[i].history = ['3']
			this.players[i].combo_input = []
			this.players[i].ready = false;
			this.players[i].choice;
			this.players[i].moveCount = {
			0:0,
			1:0,
			2:0
			}
			if(type == "player"){
				this.players[i].player.health = this.players[i].player.max_health
			}
			this.players[i].additionalDamage = 0;
		}
		this.channel = message.channel
		this.started = false
		this.round = 1;
		this.type = type
		this.expReward = expReward
		this.gold_reward = gold_reward
		this.rating = rating
		if(this.type == "player"){ 
			this.channel = message.channel
			if(this.rating == "casual"){
				var finalMessage = "```" 
				finalMessage += "You have challenged " + player2.name + " to a duel! \n"
				finalMessage += "Type *!decline to decline \n"
				finalMessage += "```"
				this.wumbo(this.player1.player,finalMessage)
				finalMessage = "```"
				finalMessage += "You have been challenged to a duel by " + player1.name + "! \n"
				finalMessage += "Type *!accept to accept \n" 
				finalMessage += "Type *!decline to decline \n"
				finalMessage += "```"
				this.wumbo(this.player2.player,finalMessage)
			}
			if(this.rating == "ranked"){
				this.start()
			}
		} else {
		this.scenarios;
		this.guild = message.guild
		var finalMessage = "** How to attack ** \n"
		finalMessage += "```"
		finalMessage += "Usage: *!(attack) \n"
		finalMessage += "Example: *!rush \n"
		finalMessage += "Attacks: rush / counter / strike \n"
		finalMessage += "```"
		this.wumbo(this.player1.player,finalMessage)
		}
	}

	choose(callback){
		var scenario = ""
		for (var i = this.player1.history.length - 1; i >= 0; i--) {
			scenario += String(this.player1.history[i])
			if(i != 0){
				scenario += "-"
			}
		}	
		this.player2.ready = true;
		database.once('value').then(function(snapshot) {
			var scenarios = snapshot.val()
			if(scenarios == null){
				scenarios = {}
			}
			if(scenarios[scenario] == undefined){
				scenarios[scenario] = choiceTemplate
			}
			var choice = weightedRandom(scenarios[scenario])
			callback(scenarios,scenario,choice)
		});
	}

	start(){
		var finalMessage = ""
		if (this.rating == "ranked") {
		finalMessage += "__**Ranked Match**__ \n"
		finalMessage += "```"
		finalMessage += this.player1.player.name + " vs " + this.player2.player.name + " begins now! \n" 
		finalMessage += "```"	
		} else {
		finalMessage += "```"
		finalMessage += this.player1.player.name + " vs " + this.player2.player.name + " begins now! \n" 
		finalMessage += "```"
		}
		finalMessage += "** How to attack ** \n"
		finalMessage += "```"
		finalMessage += "Usage: *!(attack) \n"
		finalMessage += "Example: *!rush \n"	
		finalMessage += "Attacks: rush / counter / strike \n \n"
		finalMessage += "Type *!forfeit to forfeit \n" 
		finalMessage += "```"
		this.dmPlayers(finalMessage)
		this.started = true;
	}

	end(player){
		var finalMessage = "```"
		finalMessage += player.name + " declined the challange. \n"
		finalMessage += "```"
		this.dmPlayers(finalMessage)
		duels.splice(duels.indexOf(this),1)
	}

	forfeit(player){
			var winner;
			var loser;
			var finalMessage = "```"
			finalMessage += "The duel has been forfeited by " + player.name + ". \n"
			finalMessage += "```"
			this.dmPlayers("The duel has been forfeited by " + player.name + ".")
			if(player.id == this.player1.player.id){
				winner = this.player2.player
				loser = this.player1.player
			}
			if(player.id == this.player2.id){
				winner = this.player1.player
				loser = this.player2.player
			}
			if(this.rating == "ranked"){
				var elo = 10 + (winner.elo - loser.elo)/10
				winner.elo += elo
				loser.elo -= elo
				loser.ranked_loses += 1
				winner.ranked_wins += 1
				var winnerMessage = "```"
				var loserMessage = "```"	
				winnerMessage += "You gained " + elo + " elo rating. \n"
				loserMessage += "You lost " + elo + " elo rating. \n"
				winnerMessage += "```"
				loserMessage += "```"	
				this.wumbo(loser,loserMessage)
				this.wumbo(winner,winnerMessage)
			} else if (this.rating = "casual"){
				winner.casual_wins += 1
			}
			updatePlayer(winner,function(){
				updatePlayer(loser,function(){
					duels.splice(duels.indexOf(this),1)
				})
			})
	}

	wumbo(player,message){
		var saved_message
		client.fetchUser(String(player.id)).then(user => 
			user.createDM().then(dm => {
						dm.sendMessage(message).then(message => {
							// message.delete(15000)
						})
					}
				)
			)
	}



	dmPlayers(message){
		if(this.type == "player"){
			this.wumbo(this.player1.player,message)
			this.wumbo(this.player2.player,message)
		} else {
			this.wumbo(this.player1.player,message)
		}
	}

	update(player,choice){
		if(this.type == "player"){
			if(player.id == this.player1.player.id && !this.player1.ready){
				this.dmPlayers("**" + this.player1.player.name + " is ready.**")
				this.player1.choice = choice
				this.player1.ready = true;
			}
			if(player.id == this.player2.player.id && !this.player2.ready){
				this.dmPlayers("**" + this.player2.player.name + " is ready.**")
				this.player2.choice = choice
				this.player2.ready = true;
			}
			if(this.player2.ready && this.player1.ready){
				this.getResult()
			}
		} else {
			this.player1.choice = choice
			this.player1.ready = true;
		}
	}

	checkWeapon(player,winner,callback){
		if(player.weapon.effect != undefined){
			for (var i = player.weapon.effect.effectOnMoves.length - 1; i >= 0; i--) {
				if(player.weapon.effect.effectOnMoves[i] == player.choice.id){
					var counters = true
					var success = true
					if(player.weapon.effect.requiresCounters){
						counters = false
							var flag = {
								0:false,
								1:false,
								2:false
							}
							for (var x = player.weapon.effect.requiredCounters.length - 1; x >= 0; x--) {
								if(player.weapon.effect.requiredCounters[x] == -1){
									flag[String(x)] = true
								} else {
									flag[String(x)] = player.moveCount[String(x)] == player.weapon.effect.requiredCounters[x];
								}
							}
						if (flag[String(0)] && flag[String(1)] && flag[String(2)]){
							counters = true
						}
					}
					if(player.weapon.effect.requiresSuccess != 0){
						var success = false
						var req = player.weapon.effect.requiresSuccess 
						if (req == 1 && winner == player){
							success = true
						}
						if (req == -1 && winner != player){
							success = true
						}
						if (req == 2 && winner == "tie"){
							success = true
						}
					}
					if(counters && success){
					var value = player.weapon.effect.modifier;
					if(player.weapon.effect.modiferValueEqualsCounters) {
						value = player.weapon.effect.modifier * player.moveCount[player.weapon.effect.equalCounter]
					}
					if(player.weapon.effect.clearCounters){
							player.moveCount[player.weapon.effect.equalCounter] = 0;
					}
						callback(value);
					}					
				}
			}
		} else {
			callback(0)
		}
	}

	getResult(){
		var matchWinner;
		if(this.player2.choice.id == "0" && this.player1.choice.id == "0"){
			matchWinner = "tie"
		}
		if(this.player2.choice.id == "0" && this.player1.choice.id == "1"){
			matchWinner = this.player2
		}
		if(this.player2.choice.id == "0" && this.player1.choice.id == "2"){
			matchWinner = this.player1
		}
		if(this.player2.choice.id == "1" && this.player1.choice.id == "0"){
			matchWinner = this.player1
		}
		if(this.player2.choice.id == "1" && this.player1.choice.id == "1"){
			matchWinner = "tie"
		}
		if(this.player2.choice.id == "1" && this.player1.choice.id == "2"){
			matchWinner = this.player2
		}
		if(this.player2.choice.id == "2" && this.player1.choice.id == "0"){
			matchWinner = this.player2
		}
		if(this.player2.choice.id == "2" && this.player1.choice.id == "1"){
			matchWinner = this.player1
		}
		if(this.player2.choice.id == "2" && this.player1.choice.id == "2"){
			matchWinner = "tie"
		}
		this.player2.history.push(this.player2.choice.id)
		this.player1.history.push(this.player1.choice.id)
		var message = ""
		if(this.type == "bot"){
		message += "__**Turn #" + this.round + " - " + this.player1.player.mention + " vs " + this.player2.player.name + "**__ \n"
		} else {
		message += "__**Turn #" + this.round + " - " + this.player1.player.name + " vs " + this.player2.player.name + "**__ \n"
		}
		message += "```"
		for (var i = this.players.length - 1; i >= 0; i--) {
			this.players[i].combo;
			this.players[i].combo_input.push(parseInt(this.players[i].choice.id))
			if(this.players[i].combo_input.length > 3){
				this.players[i].combo_input.splice(0,1)
			}
			if(this.players[i].combo_input.length > 3){
				this.players[i].combo_input.splice(0,1)
			}
			if(this.players[i].combos != undefined){
				for (var x = this.players[i].combos.length - 1; x >= 0; x--) {
						var flag = (this.players[i].combos[x].recipe[0] == this.players[i].combo_input[0])
						var flag1 = (this.players[i].combos[x].recipe[1] == this.players[i].combo_input[1])
						var flag2 = (this.players[i].combos[x].recipe[2] == this.players[i].combo_input[2])
				 		if(flag1 && flag2 && flag){
				 			this.players[i].combo = this.players[i].combos[x]
				 		}
				}
			}
			this.players[i].dmgMod = {
				times:1,
				plus:0
			}
			if(this.players[i].player.combo != undefined){
				if(this.players[i].combo.stat_modify == "damage"){
					if(this.players[i].combo.modifier == "x"){
						this.players[i].dmgMod.times = this.players[i].combo.amount
					}
					if(this.players[i].combo.modifier == "+"){
						this.players[i].dmgMod.plus = this.players[i].combo.amount
					}
					if(this.players[i].combo.modifier == "%+"){
						this.players[i].dmgMod.plus = this.players[i].combo.amount * this.players[i].player.weapon.moveDamage[this.players[i].player.weapon.level - 1][this.players[i].choice.id]
					}
					message += this.players[i].player.name + " activated combo " + this.players[i].player.combo.name + "! \n \n"
				}
			}
			this.players[i].moveCount[this.players[i].choice.id] += 1
			var additionalDamage = 0;
			var additionalHealth = 0;
			var player = this.players[i]
			this.checkWeapon(player,matchWinner,function(modifier){
				if(modifier != 0){
						message += player.player.name + " activated weapon effect " + player.weapon.effect.name + "! \n \n"
					if (player.weapon.effect.effectModifier == "damage") {
						additionalDamage = modifier
					}
					if (player.weapon.effect.effectModifier == "heal") {
						additionalHealth = modifier
						message += player.player.name + " gained " + modifier + " health! \n \n"
					}
				}
			})
			this.players[i].player.health += additionalHealth
			if(this.players[i].player.health >= this.players[i].player.max_health){
				this.players[i].player.health = this.players[i].player.max_health
			}
			this.players[i].additionalDamage = additionalDamage
			this.players[i].dmg = this.players[i].weapon.moveDamage[this.players[i].weapon.level - 1][this.players[i].choice.id] + this.players[i].additionalDamage
			this.players[i].additionalDamage = 0
		}
		if(matchWinner == this.player2){
			if(this.type == "bot"){
				this.scenarios[this.scenario][parseInt(this.player1.choice.id)].chance += 7
			}
				message += this.player1.player.name + " " + this.player1.choice.name + " and dealt " + ((parseInt(this.player1.dmg * .25) *this.player1.dmgMod.times) + this.player1.dmgMod.plus)  + " damage! \n"
				message += " \n"
				message += this.player2.player.name + " " + this.player2.choice.name + " and dealt " + ((this.player2.dmg * this.player2.dmgMod.times) + this.player2.dmgMod.plus) + " damage! \n"
			this.player1.player.health -= (this.player2.dmg * this.player2.dmgMod.times) + this.player2.dmgMod.plus;
			this.player2.player.health -= (parseInt(this.player1.dmg * .25)  *this.player1.dmgMod.times) +this.player1.dmgMod.plus;
		}
		if(matchWinner == this.player1){
			if(this.type == "bot"){
				this.scenarios[this.scenario][parseInt(this.player1.choice.id)].chance -= 7
			}
				message += this.player2.player.name + " " + this.player2.choice.name + " and dealt " + ((parseInt(this.player2.dmg * .25) * this.player2.dmgMod.times) + this.player2.dmgMod.plus) + " damage! \n"
				message += " \n"
				message += this.player1.player.name + " " + this.player1.choice.name + " and dealt " + ((this.player1.dmg *this.player1.dmgMod.times) +this.player1.dmgMod.plus) + " damage! \n"
			this.player1.player.health -= (parseInt(this.player2.dmg * .25)  * this.player2.dmgMod.times) + this.player2.dmgMod.plus;
			this.player2.player.health -= (this.player1.dmg  *this.player1.dmgMod.times) +this.player1.dmgMod.plus;
		}
		if(matchWinner == "tie"){
				message += this.player2.player.name + " " + this.player2.choice.name + " and dealt " + ((parseInt(this.player2.dmg * .5) * this.player2.dmgMod.times) + this.player2.dmgMod.plus) + " damage! \n"
				message += " \n"
				message += this.player1.player.name + " " + this.player1.choice.name + " and dealt " + ((parseInt(this.player1.dmg * .5) *this.player1.dmgMod.times) +this.player1.dmgMod.plus) + " damage! \n"
			this.player1.player.health -= (parseInt(this.player2.dmg * .5)  * this.player2.dmgMod.times) + this.player2.dmgMod.plus;
			this.player2.player.health -= (parseInt(this.player1.dmg * .5)  *this.player1.dmgMod.times) +this.player1.dmgMod.plus;
		}
		if(this.type == "bot"){
			this.scenarios[this.scenario] = equalizeChance(this.scenarios[this.scenario])
			database.update(this.scenarios)
		}
		message += " \n"
		if(this.player1.player.health <= 0 || this.player2.player.health <= 0){
			if (this.player1.player.health <= 0 && this.player2.player.health <= 0 ){
				this.player1.player.health = parseInt(this.player1.player.max_health * .1) + 1
				this.player2.player.health = parseInt(this.player2.player.max_health * .1) + 1
				message += "**SUDDEN DEATH** \n"
				message += this.player1.player.name + "'s health has been set to " + (parseInt(this.player1.player.max_health * .1) + 1) + " \n"
				message += this.player2.player.name + "'s health has been set to " + (parseInt(this.player2.player.max_health * .1) + 1) + " \n"
				message += "``` \n"
				this.round += 1;
				this.player1.ready = false
				this.player2.ready = false
				this.dmPlayers(message)
			} else {
				var winner;
				var loser;
				if (this.player1.player.health <= 0){
					message += this.player2.player.name + " has defeated " + this.player1.player.name + "! \n"
					var channelMessage = "```"
					channelMessage += this.player2.player.name + " has defeated " + this.player1.player.name + "! \n"
					channelMessage += "```"
					this.channel.sendMessage(channelMessage)
					winner = this.player1.player
					winner = this.player2.player
					loser = this.player1.player
					if (this.type == "player" || this.player2.player.bot) {
						winner.health = this.player2.preHealth
						loser.health = this.player1.preHealth
					}
				}
				if (this.player2.player.health <= 0){
					message += this.player1.player.name + " has defeated " + this.player2.player.name + "! \n"
					var channelMessage = "```"
					channelMessage += this.player1.player.name + " has defeated " + this.player2.player.name
					if(this.type == "bot"){
						channelMessage += " Lvl " + this.player2.player.level + "! \n"
					} else {
						channelMessage += "! \n"
					}
					channelMessage += "```"
					this.channel.sendMessage(channelMessage)
					winner = this.player1.player
					loser = this.player2.player
					if (this.type == "player" || this.player2.player.bot) {
						loser.health = this.player2.preHealth
						winner.health = this.player1.preHealth
					}
				}
				if(this.rating == "ranked"){
					var elo = parseInt(10 + (winner.elo - loser.elo)/10)
					winner.elo += elo
					loser.elo -= elo
					loser.ranked_loses += 1
					winner.ranked_wins += 1	
					message =+ winner.name + " <- " + elo + " elo <- " + loser.name + " \n"
				} else if (this.rating = "casual"){
					winner.casual_wins += 1
				}
				var expGained = parseInt((this.expReward * (.1 - winner.level/1000)) * Math.pow((loser.level/winner.level),1.1) * winner.capExp)
				var goldGained = parseInt(this.gold_reward * (loser.level * .8))
				if(expGained > 0){
					message += winner.name + " gained " + expGained + " experience! \n"
					winner.exp += expGained
					while(winner.exp >= winner.capExp){
						winner.level += 1
						winner.exp -= winner.capExp
						winner.max_health = parseInt(winner.max_health * 1.5)
						winner.health += parseInt(winner.max_health * .1)
						if (winner.health >= winner.max_health) {
							winner.health = winner.max_health
						}
						winner.capExp = parseInt(winner.capExp * 1.75)
						message += winner.name + " is now level " + winner.level + "! \n"
					}
				}
				if(goldGained > 0){
					message += winner.name + " gained " + goldGained + " gold! \n"
					winner.gold += goldGained
				}
				if(this.type == "player"){
					message += "``` \n"
					this.dmPlayers(message)
					updatePlayer(winner,function(){
						updatePlayer(loser,function(){
							duels.splice(duels.indexOf(this,1))
						})
					})
				} else {
					if(winner == this.player1.player){
						if (loser.drop != undefined && loser.drop.name != "nothing"){
							message += "\n" + winner.name + " received " + loser.drop.count + " " + loser.drop.name + "!"
							var added = false
							if (winner.inventory == undefined) {
								winner.inventory = []
							}
							for (var i = winner.inventory.length - 1; i >= 0; i--) {
								if(winner.inventory[i].name == loser.drop.name){
									winner.inventory[i].count += 1
									added = true
								}
							}
							if(!added){
								winner.inventory.push(loser.drop)
							}
						}
						message += "``` \n"
						this.dmPlayers(message)
						updatePlayer(winner,function(){
							duels.splice(duels.indexOf(this),1)
						})
					} else {
						message += "``` \n"
		    			message += "```"
		    			message += "The Legend of " + this.player1.player.name.capitalize() + " has come to an end... \n"
		    			message += "```"
						this.dmPlayers(message)
	    				removePlayer(this.player1.player,function(player){
						})					
					}
				}
			}
		} else {
			message += this.player1.player.name + " has " + this.player1.player.health + " health remaining \n "
			message += " \n"
			message += this.player2.player.name + " has " + this.player2.player.health + " health remaining"
			message += "```"
			this.dmPlayers(message)
			this.round += 1;
			this.player1.ready = false
			this.player2.ready = false
		}
	}
}

client.on('ready', () => {
	console.log("Starting Duels v" + version + " ...")
	var player_data = firebase.database().ref("players/");
	player_data.once('value').then(function(snapshot) {
		var players = snapshot.val()
			for(player in players){
				playerDBRefresh(player)
			}
	})
});

client.on('guildMemberAdd', () => {

})

client.on('message', message => {
    var input = message.content.toLowerCase().trim().split(" ");
    getPlayer(message.author.id,function(player){
    	if(input[0].substring(0,2) == "*!"){
	    	if(player != undefined){
			    	if (input[0] == "*!duel" && input.length == 2 ) {
			    		findDuel(message,function(duel){
			    			if(duel == undefined){
			    				if(input[1] == "practice"){
			    					var id = ""
			    					for (var i = 4; i >= 0; i--) {
			    						id += parseInt(Math.random() * 9)
			    					}
									var weaponinfo = data.weapons[0]
									var weapon = {
											name:weaponinfo.name,
											level:1
									}
			    					var bot = {
			    						bot:true,
										name:"Test dummy #" + id,
										combos:[],
										health:30,
										max_health:30,
										weapon:weapon
									}
				    				var newDuel = new Duel(message,player,bot,"casual",0,0,"bot")
				    				duels.push(newDuel)
				    				var finalMessage = "```"
			    					finalMessage += player.name.capitalize() + " started a duel against " + newDuel.player2.player.name + "! \n"
			    					finalMessage += "```"
				    				message.channel.sendMessage(finalMessage)
			    				} else if(input[1].substring(0,2) == "<@" && input[1].slice(-1) == ">"){
			    					getPlayer(input[1].split("@")[1].replace(">","").replace("!",""),function(player2){
			    						if(player2 != undefined){
				    						var message2 = {
				    							fake: true,
				    							id: player2.id
				    						}
				    						findDuel(message2,function(duel2){
				    							if(duel2 == undefined){
				    								if(player.id != player2.id){
						    						var newDuel = new Duel(message,player,player2,"casual",0,0,"player")
						    						duels.push(newDuel)
						    						} else {
						    							message.channel.sendMessage("You can't duel yourself!")
						    						}
						    					} else {
						    						message.channel.sendMessage(player2.name.capitalize() + " is already in a duel!")
						    					}
				    						})
				    					} else {
				    						message.channel.sendMessage("Could not find non-bot player on this server")
				    					}
			    					})
			    				} else if(input[1] == "global"){
			    					player.searching_for_duel = true
			    					player.searching_type = "casual"
			    					updatePlayer(player,function(){
			    						var player_data = firebase.database().ref("players/");
										player_data.once('value').then(function(snapshot) {
										var players = snapshot.val()
										var finalMessage = "``"
											finalMessage += "Searching for opponent... \n"
											finalMessage += "type *!cancel to leave matchmaking queue \n"
											finalMessage += "```"
											message.channel.sendMessage(finalMessage)
											var playerids = []
											for(id in players){
												playerids.push(id)
											}
											playerids.sort(function(a, b){return 0.5 - Math.random()});
											for (var i = playerids.length - 1; i >= 0; i--) {
												getPlayer(playerids[i],function(player2){
													var message2 = {
						    							fake: true,
						    							id: player2.id
						    						}
						    						findDuel(message2,function(duel2){
						    							if (duel2 == undefined){
															if (player2.searching_for_duel && player2.searching_type == "casual") {
																if(player.id != player2.id){
																	player.searching_for_duel = false
																	player2.searching_for_duel = false
																	updatePlayer(player,function(){
																		updatePlayer(player2,function(){
																			var newDuel = new Duel(message,player,player2,"casual",0,0,"player")
										    								duels.push(newDuel)
																		})
																	})
									    						}
															}
														}
													})
												})
											}
										})
			    					})
			    				} else if(input[1] == "ranked"){
			    					player.searching_for_duel = true
			    					player.searching_type = "ranked"
			    					updatePlayer(player,function(){
			    						var player_data = firebase.database().ref("players/");
										player_data.once('value').then(function(snapshot) {
										var players = snapshot.val()
										var finalMessage = "```"
											finalMessage += "Searching for opponent... \n"
											finalMessage += "type *!cancel to leave ranked matchmaking queue \n"
											finalMessage += "```"
											message.channel.sendMessage(finalMessage)
											var playerids = []
											for(id in players){
												playerids.push(id)
											}
											playerids.sort(function(a, b){return 0.5 - Math.random()});
											for (var i = playerids.length - 1; i >= 0; i--) {
												getPlayer(playerids[i],function(player2){
													var message2 = {
						    							fake: true,
						    							id: player2.id
						    						}
						    						findDuel(message2,function(duel2){
						    							if (duel2 == undefined){
															if (player2.searching_for_duel && player2.searching_type == "ranked") {
																if(player.id != player2.id){
																	player.searching_for_duel = false
																	player2.searching_for_duel = false
																	updatePlayer(player,function(){
																		updatePlayer(player2,function(){
																			var newDuel = new Duel(message,player,player2,"ranked",0,0,"player")
										    								duels.push(newDuel)
																		})
																	})
									    						}
															}
														}
													})
												})
											}
										})
			    					})
			    				}
			    			} else {
			    				message.channel.sendMessage("You are already in a duel!")
			    			}
			    		})
				    }
				    if (input[0] == "*!trade" && input.length == 2 ) {
			    		findTrade(message,function(trade){
			    			if(trade == undefined){
								if(input[1].substring(0,2) == "<@" && input[1].slice(-1) == ">"){
			    					getPlayer(input[1].split("@")[1].replace(">","").replace("!",""),function(player2){
			    						if(player2 != undefined){
				    						var message2 = {
				    							fake: true,
				    							id: player2.id
				    						}
				    						findTrade(message2,function(trade2){
				    							if(trade2 == undefined){
				    								// if(player.id != player2.id){
						    						var newTrade = new Trade(message,player,player2)
						    						trades.push(newTrade)
						    						// } else {
						    						// 	message.channel.sendMessage("You can't trade yourself!")
						    						// }
						    					} else {
						    						message.channel.sendMessage(player2.name.capitalize() + " is already in a trade!")
						    					}
				    						})
				    					} else {
				    						message.channel.sendMessage("Could not find non-bot player on this server")
				    					}
			    					})
			    				}
			    			} else {
			    				message.channel.sendMessage("You are already in a trade!")
			    			}
			    		})
				    }
				    if (input[0] == "*!rush" && input.length == 1 ) {
				    	findDuel(message,function(duel){
				    		if(duel != undefined){
				    			var action = {
					    			name:"rushed",
					    			id:"0"
					    		}
					    		duel.update(player,action)
					    		if(duel.type == "bot"){
					    			duel.choose(function(scenarios,scenario,choice){
					    				duel.scenario = scenario 
					    				duel.scenarios = scenarios
					    				duel.player2.choice = choice
					    				duel.getResult()	
					    			})
					    		}
				    		} else {
				    			message.channel.sendMessage(player.name.capitalize() + " is not currently in a duel!")
				    		}
				    	})
				    }
				    if (input[0] == "*!strike" && input.length == 1 ) {
				    	findDuel(message,function(duel){
				    		if(duel != undefined){
				    			var action = {
					    			name:"struck",
					    			id:"1"
					    		}
					    		duel.update(player,action)
					    		if(duel.type == "bot"){
					    			duel.choose(function(scenarios,scenario,choice){
					    				duel.scenario = scenario 
					    				duel.scenarios = scenarios
					    				duel.player2.choice = choice
					    				duel.getResult()	
					    			})
					    		}
				    		} else {
				    			message.channel.sendMessage(player.name.capitalize() + " is not currently in a duel!")
				    		}
				    	})
				    }
				    if (input[0] == "*!counter" && input.length == 1 ) {
				    	findDuel(message,function(duel){
				    		if(duel != undefined){
					    		var action = {
					    			name:"countered",
					    			id:"2"
					    		}
					    		duel.update(player,action)
					    		if(duel.type == "bot"){
					    			duel.choose(function(scenarios,scenario,choice){
					    				duel.scenario = scenario 
					    				duel.scenarios = scenarios
					    				duel.player2.choice = choice
					    				duel.getResult()	
					    			})
					    		}
				    		} else {
				    			message.channel.sendMessage(player.name.capitalize() + " is not currently in a duel!")
				    		}
				    	})
				    }
				    if (input[0] == "*!offer" && input.length == 3 ) {
				    	findTrade(message,function(trade){
				    		if(trade != undefined){
				    			if (player.inventory != undefined) {
					    			var item = player.inventory[parseInt(input[1]) - 1]
					    			var amount = parseInt(input[2])
					    			if (item != undefined){
					    				if (amount <= item.count) {
					    					item.count = amount
					    					trade.update(player,item,parseInt(input[1]))
					    				} else {
					    					message.channel.sendMessage(player.name.capitalize() + "does not have " + amount + " " + item.name)
					    				}
						    		} else {
						    			message.channel.sendMessage("No item found at index " + parseInt(input[1]) + " in the inventory of " + player.name.capitalize() + "!")
						    		}
						    	} else {
						    		message.channel.sendMessage(player.name.capitalize() + "'s inventory is empty!")
						    	}
				    		} else {
				    			message.channel.sendMessage(player.name.capitalize() + " is not currently in a trade!")
				    		}
				    	})
				    }
				    if (input[0] == "*!confirm") {
				    	findTrade(message,function(trade){
				    		if(trade != undefined){
				    			var flag = trade.player1.offer != undefined && trade.player2.offer != undefined
				    			if(!flag){
					    		trade.confirm(player)
					    		} else {
					    			message.channel.sendMessage("Neither player has offered an item")
					    		}
				    		} else {
				    			message.channel.sendMessage(player.name.capitalize() + " is not currently in a trade!")
				    		}
				    	})
				    }
				    if (input[0]  == "*!profile" && input.length == 1 ) {
				    	message.channel.sendMessage(printProfile(player))
				    }
				    if (input[0]  == "*!inventory" && input.length == 2 ) {
				    	message.channel.sendMessage(printInventory(player.inventory,parseInt(input[1])))
				    }
				    if (input[0]  == "*!encounter" && input.length == 2 ) {
				    	if (parseInt(input[1]) <= 20 && parseInt(input[1]) >= 1){
					    	player.threatIncrement = parseInt(input[1])
					    	updatePlayer(player,function(){
					    		var finalMessage = "```"
					    		finalMessage += "Threat increment set to " + input[1] + " \n"
					    		finalMessage += "```"
					    		message.channel.sendMessage(finalMessage)
					    	})
					    } else {
					    	var finalMessage = "```"
					    	finalMessage += "Must input a value in range of 1 - 20 \n"
					    	finalMessage += "```"
					    	message.channel.sendMessage(finalMessage)
					    }
				    }
				    if (input[0]  == "*!profile" && input.length == 2 ){
				    	var player_data = firebase.database().ref("players");
						player_data.once('value').then(function(snapshot) {
							var players = snapshot.val()
								for(id in players){
									if(players[id].name == input[1].replace("_"," ")){
										getPlayer(id,function(player){
										message.channel.sendMessage(printProfile(player))
							    	})	
								}
							}
						});
				    }
				    if (input[0] == "*!remove" && input.length == 1 )  {
				    	findDuel(message,function(duel){
				    		if(duel == undefined){
						    	removePlayer(player,function(player){
						    		var finalMessage = "```"
			    					finalMessage += "The Legend of " + player.name.capitalize() + " Has Come To An End.. \n"
			    					finalMessage += "```"
								    message.channel.sendMessage(finalMessage)
						    	})
						    } else {
						    	message.channel.sendMessage("You must finish your duel before you end your journey!")
						    }
				    	})
					}
					if (input[0] == "*!cancel" && input.length == 1 )  {
						if (player.searching_for_duel){
							player.searching_for_duel = false
							updatePlayer(player,function(){
								message.channel.sendMessage("You have left the matchmaking queue!")	
							})
						} else {
							message.channel.sendMessage("You are not currently in matchmaking!")
						}
					}
					if (input[0] == "*!accept" && input.length == 1 )  {
				    	findDuel(message,function(duel){
				    		if(duel != undefined){
						    	if (duel.type == "player"){
						    		if(duel.player2.player.id == player.id && !duel.started){
						    			duel.start()
						    		}
						    	} else {
						    		message.channel.sendMessage("You can not accept CPU duels!")	
						    	}
						    } else {
						    	message.channel.sendMessage("You have not been challenged to a duel yet!")
						    }
				    	})
					}
					if (input[0] == "*!decline" && input.length == 1 )  {
				    	findDuel(message,function(duel){
				    		if(duel != undefined){
						    	if (duel.type == "player"){
						    		if(!duel.started){
						    			duel.end(player)
						    		}
						    	} else {
						    		message.channel.sendMessage("You can not decline CPU duels!")	
						    	}
						    } else {
						    	message.channel.sendMessage("You have not been challenged to a duel yet!")
						    }
				    	})
					}
					if (input[0] == "*!taccept" && input.length == 1 )  {
				    	findTrade(message,function(trade){
				    		if(trade != undefined){
						    	if(trade.player2.player.id == player.id && !trade.started){
						    		trade.start()
						    	}
						    } else {
						    	message.channel.sendMessage("You have not been invited to a trade yet!")
						    }
				    	})
					}
					if (input[0] == "*!tdecline" && input.length == 1 )  {
				    	findTrade(message,function(trade){
				    		if(trade != undefined){
						    	if(!trade.started){
						    		trade.end(player)
						    	}
						    } else {
						    	message.channel.sendMessage("You have not been invited to a trade yet!")
						    }
				    	})
					}
					if (input[0] == "*!forfeit" && input.length == 1 )  {
				    	findDuel(message,function(duel){
				    		if(duel != undefined){
						    	if (duel.type == "player" && duel.started){
						    		duel.forfeit(player)
						    	} else {
						    		message.channel.sendMessage("You can not forfeit CPU duels!")	
						    	}
						    } else {
						    	message.channel.sendMessage("You have not been challenged to a duel yet!")
						    }
				    	})
					}
			} else if (input[0] == "*!create" && input.length == 1 )  {
	    				createPlayer(message,function(player){
	    				var finalMessage = "```"
	    				finalMessage += "The Legend of " + player.name.capitalize() + " Begins! \n"
	    				finalMessage += "```"
						message.channel.sendMessage(finalMessage)
	    		})
			} else if(input[0] != "*!help"){
				var finalMessage = "```"
	    		finalMessage += "No profile found for " + message.author.username + " \n"
	    		finalMessage += "```"
				message.channel.sendMessage(finalMessage)
			}
			if(input[0] == "*!help" && input.length == 1){
				finalMessage = ""
				finalMessage += "__Discord Duels by @Darkspine77__ \n \n"
				finalMessage += "** *!create ** \n"
				finalMessage += "```"
				finalMessage += "Function: Creates a duel profile \n"
				finalMessage += "Usage: *!create \n"
				finalMessage += "Example_1: *!create \n"
				finalMessage += "``` \n"
				finalMessage += "** *!remove ** \n"
				finalMessage += "```"
				finalMessage += "Function: Removes a duel profile \n"
				finalMessage += "Usage: *!remove \n"
				finalMessage += "Example_1: *!remove \n"
				finalMessage += "``` \n"
				finalMessage += "** *!profile ** \n"
				finalMessage += "```"
				finalMessage += "Function: Views a duel profile \n"
				finalMessage += "Usage: *!profile \n"
				finalMessage += "Example_1: *!profile \n"
				finalMessage += "Example_2: *!profile Darkspine77  \n"
				finalMessage += "``` \n"
				finalMessage += "** *!duel ** \n"
				finalMessage += "```"
				finalMessage += "Function: Initiates a duel \n"
				finalMessage += "Usage: *!duel (Opponent) \n"
				finalMessage += "Example_1: *!duel practice\n"
				finalMessage += "Example_2: *!duel @Darkspine77\n"
				finalMessage += "Example_3: *!duel global\n"
				finalMessage += "Example_4: *!duel ranked\n"
				finalMessage += "``` \n"
				finalMessage += "** Attacks ** \n"
				finalMessage += "```"	
				finalMessage += "Function: Initiates an attack when in a duel \n"
				finalMessage += "Usage: *!(attack) \n"
				finalMessage += "Example_1: *!rush \n"
				finalMessage += "Attacks: rush / counter / strike \n"
				finalMessage += "``` \n"
				finalMessage += "** *!weapon ** \n"
				finalMessage += "```"
				finalMessage += "Function: Gets info on a weapon \n"
				finalMessage += "Usage: *!weapon (weapon name / weapon id) \n"
				finalMessage += "Example_1: *!weapon Beginner's_Sword\n"
				finalMessage += "Example_2: *!weapon 001 \n"
				finalMessage += "``` \n"
				finalMessage += "** *!effect ** \n"
				finalMessage += "```"
				finalMessage += "Function: Gets info on a weapon effect \n"
				finalMessage += "Usage: *!effect (effect name / effect id) \n"
				finalMessage += "Example_1: *!effect Resting_Assualt\n"
				finalMessage += "Example_2: *!effect 001 \n"
				finalMessage += "``` \n"
				finalMessage += "** *!combo ** \n"
				finalMessage += "```"
				finalMessage += "Function: Gets info on a combo \n"
				finalMessage += "Usage: *!combo (combo name / combo id) \n"
				finalMessage += "Example_1: *!combo Precision_Strike\n"
				finalMessage += "Example_2: *!combo 001 \n"
				finalMessage += "``` \n"
				finalMessage += "** *!encounter ** \n"
				finalMessage += "```"
				finalMessage += "Function: Changes encounter level \n"
				finalMessage += "Usage: *!encounter (Encounter level) \n"
				finalMessage += "Example_1: *!encounter 20 \n"
				finalMessage += "``` \n"
				finalMessage += "** *!trade ** \n"
				finalMessage += "```"
				finalMessage += "Function: Invites a player to trade \n"
				finalMessage += "Usage: *!trade (Player) \n"
				finalMessage += "Example: *!trade @Darkspine77 \n"
				finalMessage += "```"
				client.fetchUser(String(message.author.id)).then(user => 
					user.createDM().then(dm => {
								dm.sendMessage(finalMessage).then(message => {
									// message.delete(15000)
								})
							}
						)
					)
			}
			if(input[0] == "*!weapon" && input.length == 2){
				for (var i = data.weapons.length - 1; i >= 0; i--) {
					if(data.weapons[i].name.toLowerCase() == input[1].replace("_"," ") || data.weapons[i].id == input[1]){
						message.channel.sendMessage(printWeapon(data.weapons[i]))
					}
				}
			}
			if(input[0] == "*!weapon" && input.length == 1){
				for (var i = data.weapons.length - 1; i >= 0; i--) {
					if(data.weapons[i].name.toLowerCase() == player.weapon.name.toLowerCase()){
						message.channel.sendMessage(printWeapon(data.weapons[i]))
					}
				}
			}
			if(input[0] == "*!effect" && input.length == 2){
				for (var i = data.effects.length - 1; i >= 0; i--) {
					if(data.effects[i].name.toLowerCase() == input[1].replace("_"," ") || data.effects[i].id == input[1]){
						message.channel.sendMessage(printEffect(data.effects[i]))
					}
				}
			}
			if(input[0] == "*!combo" && input.length == 2){
				for (var i = data.combos.length - 1; i >= 0; i--) {
					if(data.combos[i].name.toLowerCase() == input[1].replace("_"," ") || data.combos[i].id == input[1]){
						message.channel.sendMessage(printCombo(data.combos[i]))
					}
				}
			}
		} else {
			if(!message.author.bot && player != undefined){
				var encounterChances = [
					{
						encounter:true,
						chance:player.threat
					},
					{
						encounter:false,
						chance:100 - player.threat
					}
				]
				if(!weightedRandom(encounterChances).encounter){
					player.health += parseInt(player.max_health * .01)
					player.threat += player.threatIncrement;
					if (player.health >= player.max_health) {
						player.health = player.max_health
					}
					if(player.threat > 100) {
						player.threat = 100
					}
					updatePlayer(player,function(){})
				} else {	
					player.threat = 0
					updatePlayer(player,function(){
						findDuel(message,function(duel){
							findTrade(message,function(trade){
								if (trade == undefined) {
						    		if(duel == undefined){
										var enemyR = data.creatures.random()
										var level = player.level + Math.floor(Math.random() * 6) - 3;
										if(level <= 0){
											level = 1
										}
										var enemy = {
											name:enemyR.name,
											combos:[],
											level:level,
											health:parseInt(enemyR.base_health * (enemyR.level_multiplier * level)),
											max_health:parseInt(enemyR.base_health * (enemyR.level_multiplier * level)),
											weapon:enemyR.weapon,
											drop:rollDrops(enemyR)
										}
									   	var newDuel = new Duel(message,player,enemy,"casual",enemyR.exp_level,enemyR.gold_yield,"bot")
									   	duels.push(newDuel)
									   	var finalMessage = "```"
					    					finalMessage += player.name.capitalize() + " was attacked by " + newDuel.player2.player.name + " Lvl " + newDuel.player2.player.level +  "! \n"
					    					finalMessage += "```"
									   	message.channel.sendMessage(finalMessage)			
									}
								}
							})
						})		
					})
				}
			}
		}
	})
});