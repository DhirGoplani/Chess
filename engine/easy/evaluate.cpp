#include"board.h"
#include<string>
#include<bitset>
using namespace std;

static const int MATERIAL[6] = {100, 500, 325, 330, 900, 20000}; // Pawn Rook Knight Bishop Queen King in that order

static int popcount(BB b) {
    return __builtin_popcountll(b);
}

static BB fileMask(int file) {
    return Board::afile << file;
}

static BB kingZone(int kingIdx) {
    int file = kingIdx % 8;
    BB zone = fileMask(file);
    if (file > 0) zone |= fileMask(file - 1);
    if (file < 7) zone |= fileMask(file + 1);
    return zone;
}

static int kingSafety(Board& board, int colour) {
    int score = 0;

    BB kingBB = board.pieces[colour][Board::KING];
    if(!kingBB) return 0;
    int kingIdx = 0;
    while (!((kingBB >> kingIdx) & 1)) kingIdx++;
    int kingRank = kingIdx / 8;
    BB zone      = kingZone(kingIdx);
    int shieldRankStart = (colour == Board::WHITE) ? kingRank + 1 : kingRank - 2;
    int shieldRankEnd   = (colour == Board::WHITE) ? kingRank + 2 : kingRank - 1;
    BB friendlyPawns = board.pieces[colour][Board::PAWN];
    BB allPawns      = friendlyPawns | board.pieces[1 - colour][Board::PAWN];
    for(int r = min(shieldRankStart, shieldRankEnd); r <= max(shieldRankStart, shieldRankEnd); r++){
        if(r < 0 || r > 7) continue;
        BB rankMask = Board::rank1 << (r * 8);
        BB shieldSquares = zone & rankMask;
        int shieldPawns  = popcount(friendlyPawns & shieldSquares);
        score += shieldPawns * 15;   // +15 per shielding pawn
    }

    for (int f = max(0, (kingIdx % 8) - 1);
             f <= min(7, (kingIdx % 8) + 1); f++) {
        BB file = fileMask(f);
        if (!(allPawns & file))      score -= 30;  // fully open file
        else if (!(friendlyPawns & file)) score -= 15;  // half-open file
    }

    return score;
}

int evaluate(Board& board) {
    int score = 0;
    for(int colour = 0; colour < 2; colour++) {
        int sign = (colour == Board::WHITE) ? 1 : -1;
        for(int p = 0; p < 6; p++) score += sign * MATERIAL[p] * popcount(board.pieces[colour][p]);
        score += sign * kingSafety(board, colour);
    }
    return score;
}
