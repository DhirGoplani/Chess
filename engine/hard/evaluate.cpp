#include "board.h"
#include <string>
#include <bitset>
using namespace std;

static const int MATERIAL[6] = {100, 500, 325, 330, 900, 20000};

static int popcount(BB b) { return __builtin_popcountll(b); }
static BB fileMask(int file) { return Board::afile << file; }

static const int PST_PAWN[64] = {
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
};

static const int PST_KNIGHT[64] = {
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
};

static const int PST_BISHOP[64] = {
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
};

static const int PST_ROOK[64] = {
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
};

static const int PST_QUEEN[64] = {
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
};

static const int PST_KING_MIDGAME[64] = {
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
};

static const int PST_KING_ENDGAME[64] = {
    -50,-40,-30,-20,-20,-30,-40,-50,
    -30,-20,-10,  0,  0,-10,-20,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-30,  0,  0,  0,  0,-30,-30,
    -50,-30,-30,-30,-30,-30,-30,-50,
};

static const int* PST[6] = {
    PST_PAWN, PST_ROOK, PST_KNIGHT, PST_BISHOP, PST_QUEEN, PST_KING_MIDGAME
};

static int pstScore(int piece, int sqIdx, int colour, bool endgame) {
    int idx = (colour == Board::WHITE) ? sqIdx : (56 - (sqIdx / 8) * 8 + (sqIdx % 8));
    if (piece == Board::KING)
        return endgame ? PST_KING_ENDGAME[idx] : PST_KING_MIDGAME[idx];
    return PST[piece][idx];
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
    if (!kingBB) return 0;

    int kingIdx = __builtin_ctzll(kingBB);
    int kingRank = kingIdx / 8;
    BB zone = kingZone(kingIdx);
    BB friendlyPawns = board.pieces[colour][Board::PAWN];
    BB allPawns = friendlyPawns | board.pieces[1 - colour][Board::PAWN];

    for (int d = 1; d <= 2; d++) {
        int r = (colour == Board::WHITE) ? kingRank + d : kingRank - d;
        if (r < 0 || r > 7) continue;
        BB rankMask = Board::rank1 << (r * 8);
        int shieldPawns = popcount(friendlyPawns & zone & rankMask);
        score += shieldPawns * (d == 1 ? 20 : 10);
    }

    int kf = kingIdx % 8;
    for (int f = max(0, kf - 1); f <= min(7, kf + 1); f++) {
        BB file = fileMask(f);
        if (!(allPawns & file))           score -= 40;
        else if (!(friendlyPawns & file)) score -= 20;
    }

    BB enemyQueens  = board.pieces[1 - colour][Board::QUEEN];
    BB enemyRooks   = board.pieces[1 - colour][Board::ROOK];
    BB enemyKnights = board.pieces[1 - colour][Board::KNIGHT];
    BB extZone = zone;
    if (colour == Board::WHITE) extZone |= (zone << 8);
    else                        extZone |= (zone >> 8);

    score -= popcount(enemyQueens  & extZone) * 30;
    score -= popcount(enemyRooks   & extZone) * 20;
    score -= popcount(enemyKnights & extZone) * 15;

    return score;
}

static int pawnStructure(Board& board, int colour) {
    int score = 0;
    BB myPawns    = board.pieces[colour][Board::PAWN];
    BB theirPawns = board.pieces[1 - colour][Board::PAWN];
    BB temp = myPawns;

    while (temp) {
        int idx  = __builtin_ctzll(temp);
        temp    &= temp - 1;
        int file = idx % 8;
        int rank = idx / 8;

        BB fileMask_ = fileMask(file);

        if (popcount(myPawns & fileMask_) > 1) score -= 20;

        BB neighbours = 0;
        if (file > 0) neighbours |= fileMask(file - 1);
        if (file < 7) neighbours |= fileMask(file + 1);
        if (!(myPawns & neighbours)) score -= 15;

        BB inFront = 0;
        if (colour == Board::WHITE) {
            for (int r = rank + 1; r <= 7; r++)
                inFront |= (neighbours | fileMask_) & (Board::rank1 << (r * 8));
        } else {
            for (int r = rank - 1; r >= 0; r--)
                inFront |= (neighbours | fileMask_) & (Board::rank1 << (r * 8));
        }
        if (!(theirPawns & inFront)) {
            int advance = (colour == Board::WHITE) ? rank : 7 - rank;
            score += 20 + advance * 15;
        }
    }
    return score;
}

static int mobilityScore(Board& board, int colour) {
    int score = 0;
    BB bishops = board.pieces[colour][Board::BISHOP];
    BB rooks   = board.pieces[colour][Board::ROOK];
    BB queens  = board.pieces[colour][Board::QUEEN];
    BB knights = board.pieces[colour][Board::KNIGHT];

    while (bishops) {
        int idx = __builtin_ctzll(bishops); bishops &= bishops - 1;
        string sq = string(1, 'a' + idx % 8) + to_string(idx / 8 + 1);
        score += popcount(board.BishopMoves(sq, colour)) * 3;
    }
    while (rooks) {
        int idx = __builtin_ctzll(rooks); rooks &= rooks - 1;
        string sq = string(1, 'a' + idx % 8) + to_string(idx / 8 + 1);
        score += popcount(board.RookMoves(sq, colour)) * 2;
    }
    while (queens) {
        int idx = __builtin_ctzll(queens); queens &= queens - 1;
        string sq = string(1, 'a' + idx % 8) + to_string(idx / 8 + 1);
        score += popcount(board.QueenMoves(sq, colour)) * 1;
    }
    while (knights) {
        int idx = __builtin_ctzll(knights); knights &= knights - 1;
        string sq = string(1, 'a' + idx % 8) + to_string(idx / 8 + 1);
        score += popcount(board.KnightMoves(sq, colour)) * 4;
    }
    return score;
}

static int bishopPairBonus(Board& board, int colour) {
    return (popcount(board.pieces[colour][Board::BISHOP]) >= 2) ? 30 : 0;
}

static int rookFileBonus(Board& board, int colour) {
    int score = 0;
    BB rooks = board.pieces[colour][Board::ROOK];
    BB myPawns    = board.pieces[colour][Board::PAWN];
    BB theirPawns = board.pieces[1 - colour][Board::PAWN];
    while (rooks) {
        int idx = __builtin_ctzll(rooks); rooks &= rooks - 1;
        BB file = fileMask(idx % 8);
        if (!(myPawns & file) && !(theirPawns & file)) score += 20;
        else if (!(myPawns & file))                     score += 10;
    }
    return score;
}

static bool isEndgame(Board& board) {
    int material = 0;
    for (int c = 0; c < 2; c++) {
        material += popcount(board.pieces[c][Board::QUEEN])  * 900;
        material += popcount(board.pieces[c][Board::ROOK])   * 500;
        material += popcount(board.pieces[c][Board::BISHOP]) * 330;
        material += popcount(board.pieces[c][Board::KNIGHT]) * 325;
    }
    return material < 2600;
}

int evaluate(Board& board) {
    int score = 0;
    bool endgame = isEndgame(board);

    for (int colour = 0; colour < 2; colour++) {
        int sign = (colour == Board::WHITE) ? 1 : -1;

        for (int p = 0; p < 6; p++)
            score += sign * MATERIAL[p] * popcount(board.pieces[colour][p]);

        for (int p = 0; p < 6; p++) {
            BB bb = board.pieces[colour][p];
            while (bb) {
                int idx = __builtin_ctzll(bb); bb &= bb - 1;
                score += sign * pstScore(p, idx, colour, endgame);
            }
        }

        if (!endgame)
            score += sign * kingSafety(board, colour);

        score += sign * pawnStructure(board, colour);
        score += sign * mobilityScore(board, colour);
        score += sign * bishopPairBonus(board, colour);
        score += sign * rookFileBonus(board, colour);
    }

    return score;
}
