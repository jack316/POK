const Combat = {
    paused: false,
    trainer: null,
    trainerPoke: {},
    trainerCurrentID: 0,
    playerActivePoke: null,
    enemyActivePoke: null,
    playerTimerId: null,
    enemyTimerId: null,
    catchEnabled: false,
    init: function() {
        if (!this.paused) {
            this.playerActivePoke = player.activePoke();
            this.enemyActivePoke = enemy.activePoke();
            this.playerTimer();
            this.enemyTimer();
        }
    },
    pause: function() {
        this.paused = true;
        this.stop();
        enemy.clear();
        this.enemyActivePoke = null;
    },
    unpause: function() {
        this.paused = false;
        this.stop();
        this.newEnemy();
        this.init();
    },
    stop: function() {
        window.clearTimeout(this.playerTimerId);
        window.clearTimeout(this.enemyTimerId);
    },
    refresh: function() {
        this.stop();
        this.init();
    },
    playerTimer: function() {
        const nextAttack = this.playerActivePoke.attackSpeed();
        this.playerTimerId = window.setTimeout(
            () => this.dealDamage(this.playerActivePoke, this.enemyActivePoke, 'player'),
            nextAttack
        )
 },
    enemyTimer: function() {
        const nextAttack = this.enemyActivePoke.attackSpeed();
        this.enemyTimerId = window.setTimeout(
            () => this.dealDamage(this.enemyActivePoke, this.playerActivePoke, 'enemy'),
            nextAttack
        )
    },
    calculateDamageMultiplier: function(attackingTypes, defendingTypes) {
        const typeEffectiveness = (attackingType, defendingTypes) =>
            TYPES[attackingType][defendingTypes[0]] * (defendingTypes[1] && TYPES[attackingType][defendingTypes[1]] || 1);
        return Math.max(
            typeEffectiveness(attackingTypes[0], defendingTypes),
            attackingTypes[1] && typeEffectiveness(attackingTypes[1], defendingTypes) || 0
        )
    },
    dealDamage: function(attacker, defender, who) {
        if (!attacker || !defender) return null;
        if (attacker.alive() && defender.alive()) {
            const consoleColor = (who === 'player') ? 'green' : 'rgb(207, 103, 59)';
            // 計算傷害
            const missRNG = RNG(5);
            if (missRNG) {
                dom.gameConsoleLog(attacker.pokeName() + ' 沒打中!', consoleColor);
            } else {
                const critRNG = RNG(5);
                const critMultiplier = (critRNG) ? 1 + (attacker.level() / 100) : 1;
                const damageMultiplier = this.calculateDamageMultiplier(attacker.types(), defender.types()) * critMultiplier;
                const damage = defender.takeDamage(attacker.avgAttack() * damageMultiplier);
                if (critRNG) {
                    dom.gameConsoleLog('致命打擊!!', consoleColor);
                }
                if (who === 'player') {
                    // TODO 添加一些裝飾
                    dom.gameConsoleLog(attacker.pokeName() + ' 攻擊了 ' + damage + ' 點傷害', 'green');
                    player.statistics.totalDamage += damage;
                } else {
                    // TODO 添加一些裝飾
                    dom.gameConsoleLog(attacker.pokeName() + ' 攻擊了 ' + damage + ' 點傷害', 'rgb(207, 103, 59)');
                }
                dom.renderPokeOnContainer('enemy', enemy.activePoke());
                dom.renderPokeOnContainer('player', player.activePoke(), player.settings.spriteChoice || 'back');
            }
            if (who === 'player') {
                dom.attackAnimation('playerImg', 'right');
                this.playerTimer();
            } else {
                dom.attackAnimation('enemyImg', 'left');
                this.enemyTimer();
            }
        }
        if (!attacker.alive() || !defender.alive()) {
            // 其中一方已經倒下
            window.clearTimeout(this.playerTimerId);
            window.clearTimeout(this.enemyTimerId);

            if ((who === 'enemy') && !attacker.alive() ||
                (who === 'player') && !defender.alive())
            {
                this.enemyFaint();
            } else {
               this.playerFaint();
            }
            dom.renderPokeOnContainer('enemy', enemy.activePoke());
        }
    }, 

  enemyFaint: function() {
        if (enemy.activePoke().shiny()) {
            player.statistics.shinyBeaten++;
        } else {
            player.statistics.beaten++;
        }
        this.attemptCatch();
        this.findPokeballs(enemy.activePoke().level());
        this.findCurrency(enemy.activePoke().level());

        const beforeExp = player.getPokemon().map((poke) => poke.level());
        const expToGive = (this.enemyActivePoke.baseExp() / 16) + (this.enemyActivePoke.level() * 3);
        player.statistics.totalExp += expToGive;
        this.playerActivePoke.giveExp(expToGive);
        dom.gameConsoleLog(this.playerActivePoke.pokeName() + ' 獲得了 ' + Math.floor(expToGive) + '經驗值', 'rgb(153, 166, 11)');
        player.getPokemon().forEach((poke) => poke.giveExp((this.enemyActivePoke.baseExp() / 100) + (this.enemyActivePoke.level() / 10)));
        const afterExp = player.getPokemon().map((poke) => poke.level());

        // 檢查寶可夢是否升級
        if (beforeExp.join('') !== afterExp.join('')) {
            dom.gameConsoleLog('你的寶可夢升級了', 'rgb(153, 166, 11)');
            if (player.settings.listView == 'roster') {
                dom.renderPokeList(false);
            }
        }

        // 是不是教練的寶可夢
        if (this.trainer) {
            // 移除寶可夢
            this.trainerPoke.splice(this.trainerCurrentID, 1);
            if (this.trainerPoke.length < 1) {
                dom.gameConsoleLog('你已經擊敗了'+this.trainer.name, 'blue');
                if (this.trainer.badge) {
                    if (!player.badges[this.trainer.badge]) {
                        player.badges[this.trainer.badge] = true;
                        dom.gameConsoleLog('你獲得了 <b>' + this.trainer.badge + '</b>徽章。', 'purple');
                        dom.renderRouteList();
                    }
                }
                this.trainer = null;
                this.pause();
                return false;
            }
        }

        player.savePokes();
        this.newEnemy();
        this.enemyTimer();
        this.playerTimer();
        dom.renderPokeOnContainer('player', player.activePoke(), player.settings.spriteChoice || 'back');
    },
    newEnemy: function() {
        if (combatLoop.trainer) {
            enemy.trainerPoke(combatLoop.trainerPoke);
        } else {
            enemy.generateNew(player.settings.currentRegionId, player.settings.currentRouteId);
        }
        this.enemyActivePoke = enemy.activePoke();
        player.addPokedex(enemy.activePoke().pokeName(), (enemy.activePoke().shiny() ? POKEDEXFLAGS.seenShiny : POKEDEXFLAGS.seenNormal));
        if (enemy.activePoke().shiny()) {
            player.statistics.shinySeen++;
        } else {
            player.statistics.seen++;
        }
    },
    playerFaint: function() {
        dom.gameConsoleLog(this.playerActivePoke.pokeName() + ' 已經昏倒! ');
        const alivePokeIndexes = player.alivePokeIndexes();
        if (alivePokeIndexes.length > 0) {
            player.setActive(player.getPokemon().indexOf(alivePokeIndexes[0]));
            this.playerActivePoke = player.activePoke();
            dom.gameConsoleLog('去吧 ' + this.playerActivePoke.pokeName() + '!');
            this.refresh();
        } else {
            dom.gameConsoleLog('你已經沒有可用的寶可夢了，你已經昏倒!', 'red');
            if (this.trainer) {
                dom.gameConsoleLog('你已經被擊敗', 'red');
                this.trainer = null;
                this.pause();
            }
            flash($('#gameContainer'));
            dom.gameConsoleLog('你在最近的寶可夢中心醒來。', 'blue');
            if (ROUTES[player.settings.currentRegionId][player.settings.currentRouteId]['respawn']) {
                userInteractions.changeRoute(ROUTES[player.settings.currentRegionId][player.settings.currentRouteId]['respawn'], true);
            }
        }
        dom.renderPokeList(false);
    },
    attemptCatch: function() {
        if (this.catchEnabled == 'all' || (this.catchEnabled == 'new' && !player.hasPokemon(enemy.activePoke().pokeName(), 0)) || enemy.activePoke().shiny()) {
            dom.gameConsoleLog('試圖捕獲 ' + enemy.activePoke().pokeName() + '...', 'purple');
            const selectedBall = (enemy.activePoke().shiny() ? player.bestAvailableBall() : player.selectedBall);
            if (player.consumeBall(selectedBall)) {
                // 添加投擲統計
                player.statistics.totalThrows++;
                player.statistics[selectedBall+'Throws']++;
                dom.renderBalls();
                if (combatLoop.trainer) {
                    dom.gameConsoleLog('但是'+combatLoop.trainer.name+'擊退了你的球', 'purple');
                    return false;
                }
                const catchBonus = (player.unlocked.razzBerry) ? 1.25 : 1;
                const rngHappened = RNG(((enemy.activePoke().catchRate() * player.ballRNG(selectedBall)) / 3) * catchBonus);
                if (rngHappened) {
                    player.statistics.successfulThrows++;
                    player.statistics[selectedBall+'SuccessfulThrows']++;
                    dom.gameConsoleLog('你捕獲了 ' + enemy.activePoke().pokeName() + '!!', 'purple');
                    player.addPoke(enemy.activePoke());
                    player.addPokedex(enemy.activePoke().pokeName(), (enemy.activePoke().shiny() ? POKEDEXFLAGS.ownShiny : POKEDEXFLAGS.ownNormal));
                    if (enemy.activePoke().shiny()) {
                        player.statistics.shinyCaught++;
                        player.unlocked.shinyDex = 1;
                    } else {
                        player.statistics.caught++;
                    }
                    renderView(dom, enemy, player);
                } else {
                    dom.gameConsoleLog(enemy.activePoke().pokeName() + ' 逃脫了!!', 'purple')
                }
            }
        }
    },
findPokeballs: function(pokeLevel) {
        const ballsAmount = Math.floor(Math.random() * (pokeLevel/2)) + 1;
        const ballWeights = {
            'ultraball': 1,
            'greatball': 10,
            'pokeball': 100,
        };
        const rng = Math.floor(Math.random() * (2000 - (pokeLevel * 4)));
        for (let ballName in ballWeights) {
            if (rng < ballWeights[ballName]) {
                player.addBalls(ballName, ballsAmount);
                dom.gameConsoleLog('你找到了 ' + ballsAmount + ' 個 ' + ballName + '！！', 'purple');
                dom.renderBalls();
            }
        }
    },
    findCurrency: function(pokeLevel) {
        if (RNG(5)) {
            const foundCurrency = Math.floor(Math.random() * pokeLevel * 4) + 1;
            player.addCurrency(foundCurrency);
            dom.gameConsoleLog('你找到了 ¤' + foundCurrency + '！！', 'purple');
        }
    },
    changePlayerPoke: function(newPoke) {
        this.playerActivePoke = newPoke;
        this.refresh()
    },
    changeEnemyPoke: function(newPoke) {
        this.enemyActivePoke = newPoke;
        this.refresh()
    },
    changeCatch: function(shouldCatch) { this.catchEnabled = shouldCatch; }
};
