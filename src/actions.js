const UserActions = {
    changeRoute: function(newRouteId, force = false) {
        if (!force && player.alivePokeIndexes().length == 0) {
            dom.gameConsoleLog('沒有寶可夢是很危險的，不能進行旅行。', 'red');
            return false;
        }
        if (combatLoop.trainer) {
            dom.gameConsoleLog('你不能逃跑，這是一場訓練師之間的戰鬥。', 'red');
            return false;
        }
        if (!player.routeUnlocked(player.settings.currentRegionId, newRouteId)) {
            dom.gameConsoleLog('你現在還不能這麼做。', 'red');
            return false;
        }
        player.settings.currentRouteId = newRouteId;
        if (ROUTES[player.settings.currentRegionId][player.settings.currentRouteId]['town']) {
            combatLoop.pause();
        } else {
            combatLoop.unpause();
        }
        renderView(dom, enemy, player);
        player.savePokes();
        dom.renderRouteList();
    },
changePokemon: function(newActiveIndex) {
        player.setActive(newActiveIndex);
        combatLoop.changePlayerPoke(player.activePoke());
        renderView(dom, enemy, player)
    },
    deletePokemon: function(event, index, from = 'roster') {
        const pokeList = (from === 'roster') ? player.getPokemon() : player.storage;
        if (event.shiftKey) {
            // 你必須至少保留一隻活躍的寶可夢
            if (from !== 'roster' || pokeList.length > 1) {
                const pokemon = pokeList[index];
                player.deletePoke(index, from);
                const hasPoke = player.hasPokemon(pokemon.pokeName(), pokemon.shiny());
                if (!hasPoke) {
                    player.addPokedex(pokemon.pokeName(), (pokemon.shiny() ? POKEDEXFLAGS.releasedShiny : POKEDEXFLAGS.releasedNormal));
                }
                if (from === 'roster') {
                    combatLoop.changePlayerPoke(player.activePoke());
                    renderView(dom, enemy, player);
                } else {
                    dom.renderStorage();
                }
                player.savePokes();
                if (pokemon.shiny()) {
                    player.settings.releasedShiny++;
                } else {
                    player.settings.releasedNormal++;
                }
            } else {
                dom.showPopup('你必須有一隻活躍的寶可夢！');
            }
        } else {
            alert('按住 Shift 鍵，然後點擊 X 來釋放寶可夢');
        }
    },
    changeRegion: function() {
        const regionSelect = document.getElementById('regionSelect');
        const regionId = regionSelect.options[regionSelect.selectedIndex].value;
        if (player.regionUnlocked(regionId)) {
            player.settings.currentRegionId = regionId;
            if (Object.keys(ROUTES[player.settings.currentRegionId])[0].charAt(0) !== '_') {
                this.changeRoute(Object.keys(ROUTES[player.settings.currentRegionId])[0]);
            } else if (Object.keys(ROUTES[player.settings.currentRegionId])[1].charAt(0) !== '_') {
                this.changeRoute(Object.keys(ROUTES[player.settings.currentRegionId])[1]);
            } else {
                this.changeRoute(Object.keys(ROUTES[player.settings.currentRegionId])[2]);
            }

        }
        return false;
    },
    enablePokeListDelete: function() {
        player.settings.listView = 'roster';
        dom.renderListBox();
    },
    enablePokeListAutoSort: function() {
        player.settings.autoSort = $('#autoSort').checked;
        // hide or show sort dropdowns
        dom.renderPokeSort();
        dom.renderListBox();
    },
    changeDexView: function() {
        const regionSelect = document.getElementById('dexView');
        player.settings.dexView = regionSelect.options[regionSelect.selectedIndex].value;
        dom.renderPokeDex();
    },
    changeCatchOption: function(newCatchOption) {
        combatLoop.changeCatch(newCatchOption)
    },
    changeListView: function(view) {
        player.settings.listView = view;
        dom.renderListBox();
    },
    clearGameData: function() {
        if (dom.checkConfirmed('#confirmClearData')) {
            localStorage.clear();
            player.purgeData = true;
            window.location.reload(true);
        }
    },
    clearConsole: function() {
        dom.gameConsoleClear();
    },
    changeSelectedBall: function(newBall) {
        player.changeSelectedBall(newBall)
    },
    pokemonToFirst: function(pokemonIndex, from = 'roster') {
        const pokeList = (from === 'roster') ? player.getPokemon() : player.storage;
        const moveToFirst = (index, arr) => {
            arr.splice(0, 0, arr.splice(index, 1)[0])
        };

        moveToFirst(pokemonIndex, pokeList);
        player.savePokes();
        if (from === 'roster') {
            combatLoop.changePlayerPoke(player.activePoke());
            dom.renderPokeList();
        } else {
            dom.renderStorage();
        }
    },
    pokemonToDown: function(pokemonIndex, from = 'roster') {
        const pokeList = (from === 'roster') ? player.getPokemon() : player.storage;
        const moveToDown = index => arr => [
            ...arr.slice(0,parseInt(index)),
            arr[parseInt(index)+1],
            arr[parseInt(index)],
            ...arr.slice(parseInt(index)+2)
        ];
        if (pokeList[pokemonIndex + 1]) {
            const newPokemonList = moveToDown(pokemonIndex)(pokeList);
            player.reorderPokes(newPokemonList, from);
            if (from === 'roster') {
                combatLoop.changePlayerPoke(player.activePoke());
                dom.renderPokeList();
            } else {
                dom.renderStorage();
            }
            player.savePokes();
        }
    },
    pokemonToUp: function(pokemonIndex, from = 'roster') {
        const pokeList = (from === 'roster') ? player.getPokemon() : player.storage;
        const moveToUp = index => arr => [
            ...arr.slice(0,parseInt(index)-1),
            arr[parseInt(index)],
            arr[parseInt(index)-1],
            ...arr.slice(parseInt(index)+1)
        ];
        if (pokeList[pokemonIndex - 1]) {
            const newPokemonList = moveToUp(pokemonIndex)(pokeList);
            player.reorderPokes(newPokemonList, from);
            if (from === 'roster') {
                combatLoop.changePlayerPoke(player.activePoke());
                dom.renderPokeList();
            } else {
                dom.renderStorage();
            }
            player.savePokes();
        }
    },
    evolvePokemon: function(pokemonIndex) {
        player.getPokemon()[pokemonIndex].tryEvolve(player.getPokemon()[pokemonIndex].shiny());
        renderView(dom, enemy, player);
    },
 moveToStorage: function(pokemonIndex) {
        // 你必須至少保留一隻活躍的寶可夢
        if (player.pokemons.length > 1) {
            const poke = player.getPokemon()[pokemonIndex];
            player.pokemons.splice(pokemonIndex, 1);
            player.storage.push(poke);
            dom.renderPokeList();
        } else {
            dom.showPopup('你必須至少有一隻活躍的寶可夢！');
        }
    },
    moveToRoster: function(pokemonIndex) {
        // 檢查你是否有空間
        if (player.pokemons.length < 6) {
            const poke = player.storage[pokemonIndex];
            player.storage.splice(pokemonIndex, 1);
            player.pokemons.push(poke);
            dom.renderStorage();
        } else {
            dom.showPopup('你只能有六隻活躍的寶可夢！');
        }
    },
    forceSave: function() {
        player.savePokes();
        $(`#forceSave`).style.display = 'inline';
    },
    exportSaveDialog: function() {
        document.getElementById('saveDialogTitle').innerHTML = '導出你的存檔';
        if (document.queryCommandSupported('copy')) {
            document.getElementById('copySaveText').style.display = 'initial';
        }
        document.getElementById('saveText').value = player.saveToString();
        document.getElementById('loadButtonContainer').style.display = 'none';
        document.getElementById('saveDialogContainer').style.display = 'block';
        $(`#settingsContainer`).style.display = 'none';
    },
    importSaveDialog: function() {
        document.getElementById('saveDialogTitle').innerHTML = '導入存檔';
        document.getElementById('copySaveText').style.display = 'none';
        document.getElementById('saveText').value = '';
        document.getElementById('loadButtonContainer').style.display = 'block';
        document.getElementById('saveDialogContainer').style.display = 'block';
        $(`#settingsContainer`).style.display = 'none';
    },
    importSave: function() {
        if (window.confirm('載入存檔將覆蓋你現有的進度，你確定要繼續嗎？')) {
            player.loadFromString(document.getElementById('saveText').value.trim());
            document.getElementById('saveDialogContainer').style.display = 'none';
            // 重新載入所有內容
            renderView(dom, enemy, player);
            dom.renderListBox();
            dom.renderPokeSort();
            dom.renderBalls();
            dom.renderCurrency();
        }
    },
    copySaveText: function() {
        document.getElementById('saveText').select();
        document.execCommand('copy');
        window.getSelection().removeAllRanges()
    },
    changePokeSortOrder: function() {
        player.sortPokemon();
        player.savePokes();
        dom.renderStorage();
    },
    changeSpriteChoice: function() {
        if (document.getElementById('spriteChoiceFront').checked) {
            player.settings.spriteChoice = 'front';
            document.getElementById('player').className = 'container poke frontSprite'
        } else {
            player.settings.spriteChoice = 'back';
            document.getElementById('player').className = 'container poke'
        }
        player.savePokes();
        renderView(dom, enemy, player)
    },
    viewStatistics: function() {
        let statisticStrings = {
        'seen':'見過的寶可夢',
		'caught':'捕捉的寶可夢',
		'released':'釋放的寶可夢',
		'sold':'賣出的寶可夢',
		'beaten':'擊敗的寶可夢',
		'shinySeen':'見過的閃光寶可夢',
		'shinyCaught':'捕捉的閃光寶可夢',
		'shinyReleased':'釋放的閃光寶可夢',
		'shinyBeaten':'擊敗的閃光寶可夢',
		'totalDamage':'造成的總傷害',
		'totalThrows':'總的抓捕嘗試',
		'successfulThrows':'成功捕捉',
		'pokeballThrows':'精靈球投擲',
		'pokeballSuccessfulThrows':'用精靈球成功捕捉',
		'greatballThrows':'超級球投擲',
		'greatballSuccessfulThrows':'用超級球成功捕捉',
		'ultraballThrows':'高級球投擲',
		'ultraballSuccessfulThrows':'用高級球成功捕捉',
		'totalCurrency':'獲得的總金幣',
		'totalExp':'獲得的總經驗'

        };
        let statList = '';
        for (let statValue in player.statistics) {
            statList += '<li>' + statisticStrings[statValue] + ': ' + player.statistics[statValue] + '</li>';
        }
        document.getElementById('statisticsList').innerHTML = statList;
        document.getElementById('statisticsContainer').style.display = 'block'
    },
    viewSettings: function() {
        document.getElementById('settingsContainer').style.display = 'block';
        $(`#forceSave`).style.display = 'none';
    },
    viewAchievements: function() {
        let achievementHTML = '';
        let completeState, complete;
        for (let subgroup in ACHIEVEMENTS['statistics']) {
            for (let i = 0, count = ACHIEVEMENTS['statistics'][subgroup].length; i < count; i++) {
                complete = (player['statistics'][subgroup] >= ACHIEVEMENTS['statistics'][subgroup][i].value);
                completeState = complete ? ACHIEVEMENTS['statistics'][subgroup][i].value : player['statistics'][subgroup];
                achievementHTML += '<li' + (complete ? ' class="complete"' : '') + '><b>' + ACHIEVEMENTS['statistics'][subgroup][i].name + '</b>: ' + camalCaseToString(subgroup) + ' ' + completeState + '/' + ACHIEVEMENTS['statistics'][subgroup][i].value  + '</li>';
            }
        }
        for (let i = 0, count = ACHIEVEMENTS['dex']['caughtCount'].length; i < count; i++) {
            let progress = player.countPokedex(POKEDEXFLAGS.releasedNormal);
            complete = (progress >= ACHIEVEMENTS['dex']['caughtCount'][i].value);
            completeState = complete ? ACHIEVEMENTS['dex']['caughtCount'][i].value : progress;
            achievementHTML += '<li' + (complete ? ' class="complete"' : '') + '><b>' + ACHIEVEMENTS['dex']['caughtCount'][i].name + '</b>: Unique Caught ' + completeState + '/' + ACHIEVEMENTS['dex']['caughtCount'][i].value  + '</li>';
        }
        for (let i = 0, count = ACHIEVEMENTS['dex']['caught'].length; i < count; i++) {
            let progress = 0;
            let needed = ACHIEVEMENTS['dex']['caught'][i]['pokes'].length;
            let string = '';
            for (let j = 0; j < needed; j++) {
                let pokeName = ACHIEVEMENTS['dex']['caught'][i]['pokes'][j];
                string += (j > 0) ? ', ' : '';
                if (player.hasDexEntry(pokeName, POKEDEXFLAGS.releasedNormal)) {
                    string += '<s>' + pokeName + '</s>';
                    progress++;
                } else {
                    string += pokeName;
                }
            }
            complete = (progress >= needed);
            completeState = complete ? needed : progress;
            achievementHTML += '<li' + (complete ? ' class="complete"' : '') + '><b>' + ACHIEVEMENTS['dex']['caught'][i].name + '</b>: Catch ' + string  + '</li>';
        }
        document.getElementById('achievementsList').innerHTML = achievementHTML;
        document.getElementById('achievementsContainer').style.display = 'block';
    },
    viewInventory: function() {
        if (!isEmpty(player.badges)) {
            let badgesHTML = '';
            for (let badge in player.badges) {
                badgesHTML += '<li>' + badge + '</li>';
            }
            document.getElementById('badgeList').innerHTML = badgesHTML;
        }
        let inventoryHTML = 'To do';
        document.getElementById('inventoryList').innerHTML = inventoryHTML;
        document.getElementById('inventoryContainer').style.display = 'block';
    },
    viewTown: function() {
        town.renderShop();
        town.renderTrader();
        document.getElementById('townContainer').style.display = 'block';
    },
    trainerBattle: function() {
        const routeData = ROUTES[player.settings.currentRegionId][player.settings.currentRouteId];
        if (routeData['trainer'] && routeData['trainer']['poke'].length > 0) {
            combatLoop.trainer = {name: routeData['trainer']['name'], badge: routeData['trainer']['badge']};
            combatLoop.trainerPoke = Object.values(Object.assign({}, routeData['trainer']['poke']));
            combatLoop.unpause();
            combatLoop.refresh();
        }
    },
    closeStory: function() {
        if (story.canClose) {
            $(`#storyContainer`).style.display = 'none';
        }
    }
};