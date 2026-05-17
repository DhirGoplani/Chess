// g++ -O2 validmoves.cpp move.cpp evaluate.cpp search.cpp enginewrapper.cpp -o chess_engine
//
// Protocol (stdin → stdout):
//   Input:  "move e2 e4\n"        → engine applies human move, computes reply
//           "move e7 e5 q\n"      → with promotion piece (q/r/b/n)
//           "quit\n"              → exit cleanly
//   Output: "bestmove e7 e5\n"    → engine's chosen move
//           "bestmove e7 e8 q\n"  → engine move with promotion
//           "gameover checkmate\n"
//           "gameover stalemate\n"
//           "error <message>\n"

#include "board.h"
#include <iostream>
#include <string>
#include <sstream>
using namespace std;

// Declared in search.cpp
pair<string,string> getBestMove(Board&, int colour, int depth, int& promo);

static const int DEPTH = 4;

static char promoChar(int p) {
    switch(p) {
        case Board::QUEEN:  return 'q';
        case Board::ROOK:   return 'r';
        case Board::BISHOP: return 'b';
        case Board::KNIGHT: return 'n';
        default:            return '?';
    }
}

static int charToPromo(char c) {
    switch(c) {
        case 'q': return Board::QUEEN;
        case 'r': return Board::ROOK;
        case 'b': return Board::BISHOP;
        case 'n': return Board::KNIGHT;
        default:  return -1;
    }
}

// Check if the side to move has any legal moves
static bool hasLegalMoves(Board& board, int colour) {
    int dummy;
    auto [f, t] = getBestMove(board, colour, 1, dummy);
    return !f.empty();
}

int main(){
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    cout.flush();
    setvbuf(stdout, nullptr, _IONBF, 0);
    Board board;
    board.initialise();
    // Read which colour the engine plays from first line. Node sends: "engine black\n" or "engine white\n"
    string initLine;
    getline(cin, initLine);
    int engineColour = Board::BLACK; // default
    int humanColour  = Board::WHITE;
    if(initLine.find("white") != string::npos) {
        engineColour = Board::WHITE;
        humanColour  = Board::BLACK;
    }
    // If engine plays white, make the first move immediately
    if(engineColour == Board::WHITE){
        int promo = -1;
        auto [f, t] = getBestMove(board, Board::WHITE, DEPTH, promo);
        board.makeMove(f, t, promo);
        if(promo != -1)cout << "bestmove " << f << " " << t << " " << promoChar(promo) << endl;
        else{
            cout << "bestmove " << f << " " << t << endl;
        }
        cout.flush();
    }

    string line;
    while (getline(cin, line)) {
        if(line.empty()) continue;
        istringstream iss(line);
        string cmd;
        iss >> cmd;
        if(cmd == "quit")break;
        if(cmd == "move"){
            string from, to;
            char promoC = 0;
            iss >> from >> to;
            string promoStr;
            if(iss >> promoStr && !promoStr.empty()) promoC = promoStr[0];
            // Validate square format
            if(from.size() != 2 || to.size() != 2) {
                cout << "error invalid square format\n";
                cout.flush();
                continue;
            }
            // Apply the human's move
            int humanPromo = promoC ? charToPromo(promoC) : -1;
            board.makeMove(from, to, humanPromo);
            // Check result after human move (is engine now in check/mate/stalemate?)
            int nextColour = engineColour; // engine moves next
            if(!hasLegalMoves(board, nextColour)){
                if(board.isInCheck(nextColour)) cout << "gameover checkmate\n";
                else{
                    cout << "gameover stalemate\n";
                }
                cout.flush();
                continue;
            }
            // Engine thinks and replies
            int promo = -1;
            auto [ef, et] = getBestMove(board, engineColour, DEPTH, promo);
            if(ef.empty()){
                // for safe side
                if (board.isInCheck(engineColour))cout << "gameover checkmate\n";
                else{
                    cout << "gameover stalemate\n";
                }
                cout.flush();
                continue;
            }
            board.makeMove(ef, et, promo);
            if(promo != -1) cout << "bestmove " << ef << " " << et << " " << promoChar(promo) << endl;
            else{
                cout << "bestmove " << ef << " " << et << endl;
            }
            cout.flush();

            // Check result after engine move (is human now in checkmate/stalemate?)
            if (!hasLegalMoves(board, humanColour)) {
                if (board.isInCheck(humanColour))
                    cout << "gameover checkmate\n";
                else
                    cout << "gameover stalemate\n";
                cout.flush();
            }
        }
    }

    return 0;
}