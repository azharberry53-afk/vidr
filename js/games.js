/* ============================================
   FIX: js/games.js
   Add this check at the TOP of the file
   ============================================ */

// Prevent double declaration
if (typeof Games === 'undefined') {

const Games = {
    
    _lastGame: '',
    
    init() {
        console.log('🎮 Games module loaded');
    },
    

// Make available globally
if (typeof window !== 'undefined') {
    window.Games = Games;
}

} // End of typeof check


/* ============================================
   MINI GAMES MODULE
   File: js/games.js
   
   6 Games:
   - 🪙 Coin Flip
   - 🎲 Lucky Dice
   - 🎫 Scratch Card
   - 🎰 Lucky Slots (777)
   - ✊ Rock Paper Scissors
   - 🔢 Number Guess
   ============================================ */

const Games = {
    
    _lastGame: '',
    
    /* ==================
       INITIALIZE
       ================== */
    
    init() {
        // Nothing to init - games load on demand
        console.log('🎮 Games module loaded');
    },
    
    /* ==================
       MAIN PLAY DISPATCHER
       ================== */
    
    async play(gameId) {
        if (!App.currentUser) {
            App.showToast('Please log in to play', 'warning');
            return;
        }
        
        const costs = {
            coinflip: 10,
            dice: 15,
            scratch: 20,
            slots: 25,
            rps: 5,
            guess: 10
        };
        
        const cost = costs[gameId];
        if (!cost) return;
        
        if ((App.currentUser.freeCoins || 0) < cost) {
            App.showToast(`Need ⚡ ${cost} free coins to play`, 'warning');
            
            // Suggest earning coins
            if (typeof Rewards !== 'undefined') {
                setTimeout(() => {
                    App.showToast('Try Daily Reward or Spin Wheel! 🎁', 'info');
                }, 1500);
            }
            return;
        }
        
        // Play sound if available
        if (typeof Sound !== 'undefined') {
            Sound.play('pop');
        }
        
        switch (gameId) {
            case 'coinflip': this.playCoinFlip(cost); break;
            case 'dice': this.playDice(cost); break;
            case 'scratch': this.playScratch(cost); break;
            case 'slots': this.playSlots(cost); break;
            case 'rps': this.playRPS(cost); break;
            case 'guess': this.playGuess(cost); break;
        }
    },
    
    /* ==================
       COIN OPERATIONS
       ================== */
    
    async deductCoins(amount) {
        try {
            await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                freeCoins: firebase.firestore.FieldValue.increment(-amount)
            });
            App.currentUser.freeCoins -= amount;
            App.updateCoinDisplay();
        } catch (error) {
            console.error('Deduct coins error:', error);
        }
    },
    
    async addCoins(amount) {
        try {
            await db.collection(Collections.USERS).doc(App.currentUser.uid).update({
                freeCoins: firebase.firestore.FieldValue.increment(amount)
            });
            App.currentUser.freeCoins += amount;
            App.updateCoinDisplay();
            
            // XP for winning
            App.addXP(5, 'game_win');
        } catch (error) {
            console.error('Add coins error:', error);
        }
    },
    
    /* ==================
       GAME RESULT MODAL
       ================== */
    
    showGameResult(won, coinsChange, gameEmoji, message) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '600';
        modal.innerHTML = `
            <div style="width:100%;max-width:300px;background:var(--bg-secondary);
                         border-radius:var(--radius-xl);padding:28px;text-align:center;
                         box-shadow:var(--shadow-xl);">
                <div style="font-size:4rem;margin-bottom:12px;animation:bounceIn 0.4s ease;">
                    ${gameEmoji}
                </div>
                <h2 style="font-family:var(--font-display);font-size:1.3rem;margin-bottom:6px;
                            color:${won ? 'var(--success)' : 'var(--danger)'};">
                    ${won ? 'You Win! 🎉' : 'Try Again 😅'}
                </h2>
                <p style="color:var(--text-secondary);font-size:0.88rem;margin-bottom:10px;
                            padding:0 8px;">
                    ${message}
                </p>
                <p style="font-size:1.4rem;font-weight:800;margin-bottom:20px;
                            color:${won ? 'var(--success)' : 'var(--danger)'};">
                    ${won ? '+' : ''}⚡ ${coinsChange}
                </p>
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-secondary" style="flex:1;" 
                            onclick="this.closest('.modal-overlay').remove()">
                        Done
                    </button>
                    <button class="btn btn-primary" style="flex:1;" 
                            onclick="this.closest('.modal-overlay').remove(); 
                                     Games.play('${this._lastGame}')">
                        Play Again
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Play sounds
        if (typeof Sound !== 'undefined') {
            if (won) {
                Sound.play('win');
                Sound.haptic('success');
            } else {
                Sound.play('lose');
                Sound.haptic('medium');
            }
        }
        
        // Confetti on win
        if (won && typeof Wallet !== 'undefined' && Wallet.showConfetti) {
            Wallet.showConfetti();
        }
        
        // Achievements
        if (typeof App !== 'undefined') {
            if (won) App.grantAchievement('winner', 1);
            App.grantAchievement('gamer', 1);
        }
    },
    
    /* ==================
       GAME 1: COIN FLIP
       ================== */
    
    playCoinFlip(cost) {
        this._lastGame = 'coinflip';
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '500';
        modal.innerHTML = `
            <div style="width:100%;max-width:300px;background:var(--bg-secondary);
                         border-radius:var(--radius-xl);padding:28px;text-align:center;
                         box-shadow:var(--shadow-xl);">
                <h2 style="font-family:var(--font-display);margin-bottom:8px;">
                    🪙 Coin Flip
                </h2>
                <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:20px;">
                    Cost: ⚡ ${cost} | Win: ⚡ ${Math.floor(cost * 1.9)}
                </p>
                <div style="font-size:5rem;margin-bottom:20px;transition:transform 0.3s;" 
                     id="coin-display">🪙</div>
                <div style="display:flex;gap:12px;justify-content:center;">
                    <button class="btn btn-primary" style="flex:1;" 
                            onclick="Games.flipCoin('heads', ${cost}, this)">
                        Heads
                    </button>
                    <button class="btn btn-secondary" style="flex:1;" 
                            onclick="Games.flipCoin('tails', ${cost}, this)">
                        Tails
                    </button>
                </div>
                <button class="btn btn-secondary btn-full" style="margin-top:8px;" 
                        onclick="this.closest('.modal-overlay').remove()">
                    Cancel
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    async flipCoin(choice, cost, btn) {
        const modal = btn.closest('.modal-overlay');
        modal.querySelectorAll('button').forEach(b => b.disabled = true);
        
        await this.deductCoins(cost);
        
        if (typeof Sound !== 'undefined') Sound.play('spin');
        
        const coinDisplay = modal.querySelector('#coin-display');
        let flips = 0;
        const coins = ['🪙', '🟡', '🥇', '🟠'];
        
        const flipInterval = setInterval(() => {
            coinDisplay.textContent = coins[flips % coins.length];
            coinDisplay.style.transform = `rotateY(${flips * 90}deg)`;
            flips++;
        }, 100);
        
        await new Promise(r => setTimeout(r, 2000));
        clearInterval(flipInterval);
        
        // Determine result
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        coinDisplay.textContent = result === 'heads' ? '🪙' : '🥇';
        coinDisplay.style.transform = 'rotateY(0deg)';
        
        await new Promise(r => setTimeout(r, 500));
        modal.remove();
        
        const won = choice === result;
        const winAmount = Math.floor(cost * 1.9);
        
        if (won) await this.addCoins(winAmount);
        
        this.showGameResult(
            won,
            won ? winAmount : -cost,
            result === 'heads' ? '🪙' : '🥇',
            `It landed on ${result.toUpperCase()}! ${won ? 'You guessed right!' : 'Better luck next time!'}`
        );
    },
    
    /* ==================
       GAME 2: LUCKY DICE
       ================== */
    
    playDice(cost) {
        this._lastGame = 'dice';
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '500';
        modal.innerHTML = `
            <div style="width:100%;max-width:300px;background:var(--bg-secondary);
                         border-radius:var(--radius-xl);padding:28px;text-align:center;
                         box-shadow:var(--shadow-xl);">
                <h2 style="font-family:var(--font-display);margin-bottom:8px;">
                    🎲 Lucky Dice
                </h2>
                <p style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:4px;">
                    Roll 5 or 6 to win!
                </p>
                <p style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:20px;">
                    Cost: ⚡ ${cost}
                </p>
                <div style="font-size:6rem;margin-bottom:20px;" id="dice-display">🎲</div>
                <div style="background:var(--bg-tertiary);padding:10px;border-radius:var(--radius-md);
                             margin-bottom:16px;">
                    <p style="color:var(--text-secondary);font-size:0.78rem;line-height:1.6;">
                        Roll 5 = ⚡${cost * 2}<br>
                        Roll 6 = ⚡${cost * 3}<br>
                        Roll 1-4 = Lose
                    </p>
                </div>
                <button class="btn btn-primary btn-full" 
                        onclick="Games.rollDice(${cost}, this)">
                    🎲 Roll Dice!
                </button>
                <button class="btn btn-secondary btn-full" style="margin-top:8px;" 
                        onclick="this.closest('.modal-overlay').remove()">
                    Cancel
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    async rollDice(cost, btn) {
        const modal = btn.closest('.modal-overlay');
        modal.querySelectorAll('button').forEach(b => b.disabled = true);
        
        await this.deductCoins(cost);
        
        if (typeof Sound !== 'undefined') Sound.play('spin');
        
        const diceDisplay = modal.querySelector('#dice-display');
        const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        
        let rolls = 0;
        const rollInterval = setInterval(() => {
            diceDisplay.textContent = diceEmojis[Math.floor(Math.random() * 6)];
            diceDisplay.style.transform = `rotate(${rolls * 60}deg) scale(${1 + Math.sin(rolls) * 0.1})`;
            rolls++;
        }, 100);
        
        await new Promise(r => setTimeout(r, 2500));
        clearInterval(rollInterval);
        
        const result = Math.floor(Math.random() * 6) + 1;
        diceDisplay.textContent = diceEmojis[result - 1];
        diceDisplay.style.transform = 'rotate(0deg) scale(1.2)';
        
        await new Promise(r => setTimeout(r, 500));
        modal.remove();
        
        const won = result >= 5;
        const winAmount = result === 6 ? cost * 3 : result === 5 ? cost * 2 : 0;
        
        if (won) await this.addCoins(winAmount);
        
        this.showGameResult(
            won,
            won ? winAmount : -cost,
            diceEmojis[result - 1],
            `You rolled ${result}! ${won ? `You win ⚡ ${winAmount}!` : 'No win. Need 5 or 6.'}`
        );
    },
    
    /* ==================
       GAME 3: SCRATCH CARD
       ================== */
    
    async playScratch(cost) {
        this._lastGame = 'scratch';
        
        await this.deductCoins(cost);
        
        const symbols = ['⭐', '💎', '🍀', '🔥', '💜', '🌈'];
        const grid = Array(9).fill(null).map(() => 
            symbols[Math.floor(Math.random() * symbols.length)]
        );
        
        // 35% chance to win - force 3 matching symbols
        const winChance = Math.random();
        let won = false;
        if (winChance < 0.35) {
            const winSymbol = symbols[Math.floor(Math.random() * symbols.length)];
            const positions = [0, 1, 2, 3, 4, 5, 6, 7, 8];
            const winPositions = positions.sort(() => Math.random() - 0.5).slice(0, 3);
            winPositions.forEach(pos => grid[pos] = winSymbol);
            won = true;
        } else {
            // Ensure NO 3-match happens by chance
            const counts = {};
            grid.forEach(s => counts[s] = (counts[s] || 0) + 1);
            for (const [sym, count] of Object.entries(counts)) {
                if (count >= 3) {
                    // Replace one to break the match
                    const idx = grid.indexOf(sym);
                    grid[idx] = symbols.find(s => s !== sym);
                }
            }
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '500';
        modal.innerHTML = `
            <div style="width:100%;max-width:320px;background:var(--bg-secondary);
                         border-radius:var(--radius-xl);padding:24px;text-align:center;
                         box-shadow:var(--shadow-xl);">
                <h2 style="font-family:var(--font-display);margin-bottom:8px;">
                    🎫 Scratch Card
                </h2>
                <p style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:16px;">
                    Match 3 same symbols to win ⚡${cost * 3}!
                </p>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;
                             margin-bottom:16px;" id="scratch-grid">
                    ${grid.map((symbol, i) => `
                        <div class="scratch-cell" data-index="${i}"
                             onclick="Games.scratchCell(this)"
                             style="height:75px;background:var(--bg-tertiary);
                                    border-radius:var(--radius-md);cursor:pointer;
                                    display:flex;align-items:center;justify-content:center;
                                    font-size:2.2rem;border:2px solid var(--border-light);
                                    position:relative;overflow:hidden;
                                    transition:transform 0.2s;">
                            <div class="scratch-cover" 
                                 style="position:absolute;inset:0;
                                        background:linear-gradient(135deg,var(--primary),var(--accent));
                                        display:flex;align-items:center;justify-content:center;
                                        transition:opacity 0.3s;">
                                <span style="color:white;font-size:1.5rem;">🎫</span>
                            </div>
                            <span class="scratch-symbol" 
                                  style="display:none;">${symbol}</span>
                        </div>
                    `).join('')}
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-secondary" style="flex:1;" 
                            onclick="Games.revealAll(this, ${won}, ${cost})">
                        Reveal All
                    </button>
                    <button class="btn btn-secondary" style="flex:1;" 
                            onclick="Games.exitScratch(this, ${won}, ${cost})">
                        Exit
                    </button>
                </div>
                <p style="font-size:0.72rem;color:var(--text-tertiary);margin-top:8px;">
                    Tap each card to scratch
                </p>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.dataset.won = won.toString();
        modal.dataset.cost = cost;
        modal.dataset.scratched = '0';
    },
    
    scratchCell(cell) {
        const cover = cell.querySelector('.scratch-cover');
        const symbol = cell.querySelector('.scratch-symbol');
        
        if (!cover || cover.style.opacity === '0') return;
        
        if (typeof Sound !== 'undefined') Sound.play('swipe');
        
        cover.style.opacity = '0';
        setTimeout(() => {
            cover.style.display = 'none';
            symbol.style.display = 'block';
        }, 200);
        
        const modal = cell.closest('.modal-overlay');
        const scratched = parseInt(modal.dataset.scratched) + 1;
        modal.dataset.scratched = scratched;
        
        if (scratched >= 9) {
            const won = modal.dataset.won === 'true';
            const cost = parseInt(modal.dataset.cost);
            
            setTimeout(() => {
                this.completeScratch(modal, won, cost);
            }, 800);
        }
    },
    
    revealAll(btn, won, cost) {
        const modal = btn.closest('.modal-overlay');
        modal.querySelectorAll('.scratch-cover').forEach(cover => {
            cover.style.opacity = '0';
            setTimeout(() => cover.style.display = 'none', 200);
        });
        modal.querySelectorAll('.scratch-symbol').forEach(sym => {
            setTimeout(() => sym.style.display = 'block', 200);
        });
        
        setTimeout(() => {
            this.completeScratch(modal, won, cost);
        }, 1000);
    },
    
    exitScratch(btn, won, cost) {
        const modal = btn.closest('.modal-overlay');
        this.completeScratch(modal, won, cost);
    },
    
    async completeScratch(modal, won, cost) {
        modal.remove();
        
        const winAmount = cost * 3;
        if (won) await this.addCoins(winAmount);
        
        this.showGameResult(
            won,
            won ? winAmount : -cost,
            won ? '🎊' : '😅',
            won ? `3 symbols matched! You win ⚡ ${winAmount}!` : 'No match found. Try again!'
        );
    },
    
    /* ==================
       GAME 4: SLOTS 777
       ================== */
    
    playSlots(cost) {
        this._lastGame = 'slots';
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '500';
        modal.innerHTML = `
            <div style="width:100%;max-width:320px;background:var(--bg-secondary);
                         border-radius:var(--radius-xl);padding:28px;text-align:center;
                         box-shadow:var(--shadow-xl);">
                <h2 style="font-family:var(--font-display);margin-bottom:8px;">
                    🎰 Lucky Slots
                </h2>
                <p style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:16px;">
                    Cost: ⚡ ${cost}
                </p>
                
                <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;
                             background:linear-gradient(135deg, #f8b4d9, #c084fc, #818cf8);
                             border-radius:var(--radius-lg);padding:20px;">
                    <div class="slot-reel" id="slot-1" 
                         style="width:65px;height:65px;background:white;
                                border-radius:var(--radius-md);
                                display:flex;align-items:center;justify-content:center;
                                font-size:2.5rem;box-shadow:inset 0 0 8px rgba(0,0,0,0.2);">🎰</div>
                    <div class="slot-reel" id="slot-2" 
                         style="width:65px;height:65px;background:white;
                                border-radius:var(--radius-md);
                                display:flex;align-items:center;justify-content:center;
                                font-size:2.5rem;box-shadow:inset 0 0 8px rgba(0,0,0,0.2);">🎰</div>
                    <div class="slot-reel" id="slot-3" 
                         style="width:65px;height:65px;background:white;
                                border-radius:var(--radius-md);
                                display:flex;align-items:center;justify-content:center;
                                font-size:2.5rem;box-shadow:inset 0 0 8px rgba(0,0,0,0.2);">🎰</div>
                </div>
                
                <div style="background:var(--bg-tertiary);padding:10px;border-radius:var(--radius-md);
                             margin-bottom:16px;font-size:0.72rem;color:var(--text-secondary);
                             line-height:1.6;text-align:left;">
                    🎯 <strong>777</strong> = ⚡${cost * 10} JACKPOT<br>
                    💎💎💎 = ⚡${cost * 7}<br>
                    ⭐⭐⭐ = ⚡${cost * 5}<br>
                    Any 3 match = ⚡${cost * 2}
                </div>
                
                <button class="btn btn-primary btn-full" 
                        style="background:linear-gradient(135deg, #ef4444, #f97316);" 
                        onclick="Games.spinSlots(${cost}, this)">
                    🎰 SPIN!
                </button>
                <button class="btn btn-secondary btn-full" style="margin-top:8px;" 
                        onclick="this.closest('.modal-overlay').remove()">
                    Cancel
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    async spinSlots(cost, btn) {
        const modal = btn.closest('.modal-overlay');
        modal.querySelectorAll('button').forEach(b => b.disabled = true);
        
        await this.deductCoins(cost);
        
        if (typeof Sound !== 'undefined') Sound.play('spin');
        
        const symbols = ['7️⃣', '🍒', '💎', '⭐', '🍋', '🔔', '🃏'];
        const reels = ['slot-1', 'slot-2', 'slot-3'];
        const results = [];
        
        // Animate reels one at a time
        for (let i = 0; i < reels.length; i++) {
            const reel = document.getElementById(reels[i]);
            let spins = 0;
            const totalSpins = 15 + i * 5;
            
            await new Promise(resolve => {
                const spin = setInterval(() => {
                    reel.textContent = symbols[Math.floor(Math.random() * symbols.length)];
                    spins++;
                    if (spins >= totalSpins) {
                        clearInterval(spin);
                        const finalSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                        reel.textContent = finalSymbol;
                        reel.style.transform = 'scale(1.1)';
                        setTimeout(() => reel.style.transform = 'scale(1)', 200);
                        results.push(finalSymbol);
                        
                        if (typeof Sound !== 'undefined') Sound.play('click');
                        
                        resolve();
                    }
                }, 80);
            });
        }
        
        await new Promise(r => setTimeout(r, 500));
        modal.remove();
        
        const [s1, s2, s3] = results;
        let won = false;
        let winAmount = 0;
        let message = '';
        let emoji = results.join('');
        
        if (s1 === s2 && s2 === s3) {
            won = true;
            if (s1 === '7️⃣') {
                winAmount = cost * 10;
                message = '🎉 JACKPOT! 777! Massive win!';
                emoji = '💰';
            } else if (s1 === '💎') {
                winAmount = cost * 7;
                message = '💎 Triple Diamonds!';
            } else if (s1 === '⭐') {
                winAmount = cost * 5;
                message = '⭐ Triple Stars!';
            } else {
                winAmount = cost * 2;
                message = `Three ${s1}! You win!`;
            }
        } else {
            message = `${s1} ${s2} ${s3} - No match, try again!`;
        }
        
        if (won) await this.addCoins(winAmount);
        
        this.showGameResult(
            won,
            won ? winAmount : -cost,
            emoji,
            message
        );
    },
    
    /* ==================
       GAME 5: ROCK PAPER SCISSORS
       ================== */
    
    playRPS(cost) {
        this._lastGame = 'rps';
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '500';
        modal.innerHTML = `
            <div style="width:100%;max-width:320px;background:var(--bg-secondary);
                         border-radius:var(--radius-xl);padding:28px;text-align:center;
                         box-shadow:var(--shadow-xl);">
                <h2 style="font-family:var(--font-display);margin-bottom:8px;">
                    ✊ Rock Paper Scissors
                </h2>
                <p style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:20px;">
                    Cost: ⚡ ${cost} | Win: ⚡ ${cost * 2} | Draw: Refund
                </p>
                
                <div style="font-size:5rem;margin-bottom:20px;
                             transition:transform 0.3s;" id="rps-display">🤔</div>
                
                <p style="color:var(--text-secondary);font-size:0.85rem;
                          margin-bottom:12px;font-weight:600;">
                    Choose your move:
                </p>
                
                <div style="display:flex;justify-content:center;gap:12px;">
                    <button onclick="Games.playRPSChoice('rock', ${cost}, this)" 
                            style="font-size:2.8rem;width:75px;height:75px;
                                   background:var(--bg-tertiary);border-radius:var(--radius-lg);
                                   border:2px solid var(--border-color);
                                   transition:all 0.2s;">
                        ✊
                    </button>
                    <button onclick="Games.playRPSChoice('paper', ${cost}, this)" 
                            style="font-size:2.8rem;width:75px;height:75px;
                                   background:var(--bg-tertiary);border-radius:var(--radius-lg);
                                   border:2px solid var(--border-color);
                                   transition:all 0.2s;">
                        ✋
                    </button>
                    <button onclick="Games.playRPSChoice('scissors', ${cost}, this)" 
                            style="font-size:2.8rem;width:75px;height:75px;
                                   background:var(--bg-tertiary);border-radius:var(--radius-lg);
                                   border:2px solid var(--border-color);
                                   transition:all 0.2s;">
                        ✌️
                    </button>
                </div>
                <button class="btn btn-secondary btn-full" style="margin-top:16px;" 
                        onclick="this.closest('.modal-overlay').remove()">
                    Cancel
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    async playRPSChoice(choice, cost, btn) {
        const modal = btn.closest('.modal-overlay');
        modal.querySelectorAll('button').forEach(b => b.disabled = true);
        btn.style.borderColor = 'var(--primary)';
        btn.style.background = 'rgba(var(--primary-rgb), 0.1)';
        
        await this.deductCoins(cost);
        
        if (typeof Sound !== 'undefined') Sound.play('swipe');
        
        const display = modal.querySelector('#rps-display');
        const choices = ['rock', 'paper', 'scissors'];
        const emojis = { rock: '✊', paper: '✋', scissors: '✌️' };
        
        // Countdown animation
        let countdown = 3;
        display.textContent = '3';
        display.style.color = 'var(--primary)';
        display.style.fontSize = '4rem';
        
        const countInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                display.textContent = countdown.toString();
                if (typeof Sound !== 'undefined') Sound.play('click');
            } else if (countdown === 0) {
                display.textContent = '🤜💥🤛';
            } else {
                clearInterval(countInterval);
            }
        }, 500);
        
        await new Promise(r => setTimeout(r, 2000));
        clearInterval(countInterval);
        
        // Reveal bot choice
        const botChoice = choices[Math.floor(Math.random() * 3)];
        display.textContent = emojis[botChoice];
        display.style.fontSize = '5rem';
        display.style.color = 'inherit';
        display.style.transform = 'scale(1.2)';
        
        await new Promise(r => setTimeout(r, 800));
        modal.remove();
        
        const wins = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
        const won = wins[choice] === botChoice;
        const draw = choice === botChoice;
        
        let winAmount = 0;
        let resultMsg = '';
        let resultEmoji = '';
        
        if (won) {
            winAmount = cost * 2;
            await this.addCoins(winAmount);
            resultMsg = `You: ${emojis[choice]} vs Bot: ${emojis[botChoice]}. You win!`;
            resultEmoji = '🏆';
        } else if (draw) {
            winAmount = cost;
            await this.addCoins(winAmount);
            resultMsg = `Both chose ${emojis[choice]}! Draw - coins refunded.`;
            resultEmoji = '🤝';
        } else {
            resultMsg = `You: ${emojis[choice]} vs Bot: ${emojis[botChoice]}. Bot wins!`;
            resultEmoji = '😢';
        }
        
        this.showGameResult(
            won || draw,
            won ? winAmount : draw ? 0 : -cost,
            resultEmoji,
            resultMsg
        );
    },
    
    /* ==================
       GAME 6: NUMBER GUESS
       ================== */
    
    playGuess(cost) {
        this._lastGame = 'guess';
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '500';
        modal.innerHTML = `
            <div style="width:100%;max-width:300px;background:var(--bg-secondary);
                         border-radius:var(--radius-xl);padding:28px;text-align:center;
                         box-shadow:var(--shadow-xl);">
                <h2 style="font-family:var(--font-display);margin-bottom:8px;">
                    🔢 Number Guess
                </h2>
                <p style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:4px;">
                    Guess a number 1-10
                </p>
                <p style="color:var(--text-secondary);font-size:0.82rem;margin-bottom:20px;">
                    Cost: ⚡ ${cost} | Win: ⚡ ${cost * 8}
                </p>
                
                <div style="font-size:4rem;margin-bottom:20px;" id="guess-display">🎲</div>
                
                <p style="color:var(--text-secondary);font-size:0.85rem;
                          margin-bottom:12px;font-weight:600;">
                    Pick a number:
                </p>
                
                <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;
                             margin-bottom:16px;">
                    ${Array.from({length: 10}, (_, i) => i + 1).map(n => `
                        <button onclick="Games.guessNumber(${n}, ${cost}, this)"
                                style="height:48px;background:var(--bg-tertiary);
                                       border-radius:var(--radius-md);
                                       font-weight:800;font-size:1.1rem;
                                       border:2px solid var(--border-color);
                                       transition:all 0.2s;color:var(--text-primary);">
                            ${n}
                        </button>
                    `).join('')}
                </div>
                
                <button class="btn btn-secondary btn-full" 
                        onclick="this.closest('.modal-overlay').remove()">
                    Cancel
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    async guessNumber(guess, cost, btn) {
        const modal = btn.closest('.modal-overlay');
        modal.querySelectorAll('button').forEach(b => b.disabled = true);
        
        btn.style.background = 'var(--gradient-primary)';
        btn.style.color = 'white';
        btn.style.borderColor = 'var(--primary)';
        btn.style.transform = 'scale(1.1)';
        
        await this.deductCoins(cost);
        
        if (typeof Sound !== 'undefined') Sound.play('spin');
        
        const display = modal.querySelector('#guess-display');
        let count = 0;
        const countInterval = setInterval(() => {
            display.textContent = Math.floor(Math.random() * 10) + 1;
            count++;
        }, 100);
        
        await new Promise(r => setTimeout(r, 1500));
        clearInterval(countInterval);
        
        const answer = Math.floor(Math.random() * 10) + 1;
        display.textContent = answer;
        display.style.color = 'var(--primary)';
        display.style.transform = 'scale(1.3)';
        display.style.fontWeight = '800';
        
        await new Promise(r => setTimeout(r, 800));
        modal.remove();
        
        const won = guess === answer;
        const winAmount = cost * 8;
        
        if (won) await this.addCoins(winAmount);
        
        this.showGameResult(
            won,
            won ? winAmount : -cost,
            won ? '🎯' : '🔢',
            won 
                ? `The number was ${answer}! Perfect guess!` 
                : `The number was ${answer}. You guessed ${guess}.`
        );
    }
};

// Initialize
if (typeof window !== 'undefined') {
    console.log('🎮 Games module loaded');
}
