#include "board.h"
#include <iostream>
#include <string>
#include <sstream>
using namespace std;

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

static bool hasLegalMoves(Board& board, int colour) {
    int dummy;
    auto [f, t] = getBestMove(board, colour, 1, dummy);
    return !f.empty();
}

static void engineReplies(Board& board, int engineColour, int humanColour){
    if(!hasLegalMoves(board, engineColour)){
        if(board.isInCheck(engineColour)) cout << "gameover checkmate\n";
        else cout << "gameover stalemate\n";
        cout.flush();
        return;
    }
    int promo = -1;
    auto [ef, et] = getBestMove(board, engineColour, DEPTH, promo);
    if(ef.empty()){
        if(board.isInCheck(engineColour)) cout << "gameover checkmate\n";
        else cout << "gameover stalemate\n";
        cout.flush();
        return;
    }
    board.makeMove(ef, et, promo);
    if(promo != -1) cout << "bestmove " << ef << " " << et << " " << promoChar(promo) << endl;
    else cout << "bestmove " << ef << " " << et << endl;
    cout.flush();

    if(!hasLegalMoves(board, humanColour)){
        if(board.isInCheck(humanColour)) cout << "gameover checkmate\n";
        else cout << "gameover stalemate\n";
        cout.flush();
    }
}

int main(){
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    cout.flush();
    setvbuf(stdout, nullptr, _IONBF, 0);
    Board board;
    board.initialise();
    string initLine;
    getline(cin, initLine);
    int engineColour = Board::BLACK;
    int humanColour  = Board::WHITE;
    if(initLine.find("white") != string::npos) {
        engineColour = Board::WHITE;
        humanColour  = Board::BLACK;
    }
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
        if(cmd == "quit") break;

        if(cmd == "sync"){
            Board fresh;
            fresh.initialise();
            bool ok = true;
            int applied = 0;
            string mfrom, mto, mpromo;
            while(iss >> mfrom >> mto >> mpromo){
                int promo = (mpromo == "-") ? -1 : charToPromo(mpromo[0]);
                Move m = fresh.makeMove(mfrom, mto, promo);
                if(m.piece == -1){ ok = false; break; }
                applied++;
            }
            if(!ok){
                cout << "error sync failed at move " << (applied + 1) << "\n";
                cout.flush();
                continue;
            }
            board = fresh;
            cout << "synced " << applied << "\n";
            cout.flush();
            continue;
        }

        if(cmd == "go"){
            engineReplies(board, engineColour, humanColour);
            continue;
        }

        if(cmd == "move"){
            string from, to;
            char promoC = 0;
            iss >> from >> to;
            string promoStr;
            if(iss >> promoStr && !promoStr.empty()) promoC = promoStr[0];
            if(from.size() != 2 || to.size() != 2) {
                cout << "error invalid square format\n";
                cout.flush();
                continue;
            }
            int humanPromo = promoC ? charToPromo(promoC) : -1;
            Move humanMove = board.makeMove(from, to, humanPromo);
            if(humanMove.piece == -1){
                cout << "error invalid move: no piece on " << from << "\n";
                cout.flush();
                continue;
            }
            if(!hasLegalMoves(board, engineColour)){
                if(board.isInCheck(engineColour)) cout << "gameover checkmate\n";
                else cout << "gameover stalemate\n";
                cout.flush();
                continue;
            }
            engineReplies(board, engineColour, humanColour);
        }
    }

    return 0;
}
