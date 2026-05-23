#include "board.h"
#include <vector>
#include <string>
#include <algorithm>
#include <climits>
using namespace std;


int evaluate(Board& board);

// Returns index of LSB and clears it
static int popLSB(BB& b) {
    int idx = __builtin_ctzll(b);  // index of lowest set bit
    b &= b - 1;                     // clear it
    return idx;
} 

static string idxToSq(int idx) {
    return string(1, 'a' + (idx % 8)) + to_string(idx / 8 + 1);
}

struct SearchMove {
    string from, to;
    int promotion = -1;
    int score = 0;   // for move ordering
};

// Generate pseudo-legal moves for the side to move, then filter legal ones
static vector<SearchMove> generateLegalMoves(Board& board, int colour) {
    vector<SearchMove> moves;
    for (int piece = 0; piece < 6; piece++) {
        BB pieceBB = board.pieces[colour][piece];
        while (pieceBB) {
            int fromIdx = popLSB(pieceBB);
            string fromSq = idxToSq(fromIdx);
            BB targets = 0;
            switch (piece) {
                case Board::PAWN:
                    targets = (colour == Board::WHITE)
                                  ? board.WhitePawnMoves(fromSq)
                                  : board.BlackPawnMoves(fromSq);
                    break;
                case Board::KNIGHT: targets = board.KnightMoves(fromSq, colour); break;
                case Board::BISHOP: targets = board.BishopMoves(fromSq, colour); break;
                case Board::ROOK:   targets = board.RookMoves  (fromSq, colour); break;
                case Board::QUEEN:  targets = board.QueenMoves (fromSq, colour); break;
                case Board::KING: {
                    targets = board.KingMoves(fromSq, colour);
                    // Castling
                    BB ap = 0;
                    for (int i = 0; i < 2; i++)
                        for (int j = 0; j < 6; j++)
                            ap |= board.pieces[i][j];
                    if (colour == Board::WHITE) {
                        if (board.castlingRights.WhiteKingSide
                            && !(ap & (StringToBB("f1") | StringToBB("g1"))))
                            targets |= StringToBB("g1");
                        if (board.castlingRights.WhiteQueenSide
                            && !(ap & (StringToBB("b1") | StringToBB("c1") | StringToBB("d1"))))
                            targets |= StringToBB("c1");
                    } else {
                        if (board.castlingRights.BlackKingSide
                            && !(ap & (StringToBB("f8") | StringToBB("g8"))))
                            targets |= StringToBB("g8");
                        if (board.castlingRights.BlackQueenSide
                            && !(ap & (StringToBB("b8") | StringToBB("c8") | StringToBB("d8"))))
                            targets |= StringToBB("c8");
                    }
                    break;
                }
            }

            while (targets) {
                int toIdx = popLSB(targets);
                string toSq = idxToSq(toIdx);
                // Pawn promotion
                bool isPromoRank = (colour == Board::WHITE && toIdx / 8 == 7)
                                || (colour == Board::BLACK && toIdx / 8 == 0);
                if(piece == Board::PAWN && isPromoRank) {
                    for (int promo : {Board::QUEEN, Board::ROOK,
                                      Board::BISHOP, Board::KNIGHT}) {
                        Move m = board.makeMove(fromSq, toSq, promo);
                        bool legal = !board.isInCheck(colour);
                        board.unmakeMove(m);
                        if (legal) moves.push_back({fromSq, toSq, promo});
                    }
                }
                else {
                    Move m = board.makeMove(fromSq, toSq);
                    bool legal = !board.isInCheck(colour);
                    board.unmakeMove(m);
                    if (legal) moves.push_back({fromSq, toSq, -1});
                }
            }
        }
    }
    return moves;
}


// MVV-LVA: most valuable victim, least valuable attacker
static const int MATERIAL_APPROX[6] = {100, 500, 320, 330, 900, 20000};

static void scoreMoves(Board& board, vector<SearchMove>& moves, int colour) {
    int enemy = 1 - colour;
    for (auto& m : moves) {
        int fromIdx = (m.from[0] - 'a') + (m.from[1] - '1') * 8;
        int toIdx   = (m.to[0]   - 'a') + (m.to[1]   - '1') * 8;
        BB toBB     = 1ULL << toIdx;
        // Find moving piece
        int movingPiece = -1;
        for (int p = 0; p < 6; p++)
            if (board.pieces[colour][p] & (1ULL << fromIdx)) { movingPiece = p; break; }
        // Find captured piece
        int capturedPiece = -1;
        for(int p = 0; p < 6; p++){
            if(board.pieces[enemy][p] & toBB){
                capturedPiece = p;
                break;
            }
        }
        if(capturedPiece != -1 && movingPiece != -1)
            m.score = 10 * MATERIAL_APPROX[capturedPiece] - MATERIAL_APPROX[movingPiece];
        else{
            m.score = 0;
        }
        if(m.promotion == Board::QUEEN) m.score += 900;
    }
    sort(moves.begin(), moves.end(),
         [](const SearchMove& a, const SearchMove& b) { return a.score > b.score; });
}


// Returns score relative to WHITE (same convention as evaluate())
static int alphaBeta(Board& board, int depth, int alpha, int beta, int colour) {
    if (depth == 0) return evaluate(board);

    vector<SearchMove> moves = generateLegalMoves(board, colour);
    scoreMoves(board, moves, colour);
    if(moves.empty()) {
        if(board.isInCheck(colour))
            return (colour == Board::WHITE) ? -100000 : 100000;  // checkmate
        return 0;  // stalemate
    }

    if(colour == Board::WHITE) {
        int maxScore = INT_MIN;
        for (auto& m : moves) {
            Move mv = board.makeMove(m.from, m.to, m.promotion);
            int score = alphaBeta(board, depth - 1, alpha, beta, Board::BLACK);
            board.unmakeMove(mv);
            maxScore = max(maxScore, score);
            alpha    = max(alpha, score);
            if (beta <= alpha) break;  // β cut-off
        }
        return maxScore;
    }
    else{
        int minScore = INT_MAX;
        for (auto& m : moves) {
            Move mv = board.makeMove(m.from, m.to, m.promotion);
            int score = alphaBeta(board, depth - 1, alpha, beta, Board::WHITE);
            board.unmakeMove(mv);
            minScore = min(minScore, score);
            beta     = min(beta, score);
            if (beta <= alpha) break;  // α cut-off
        }
        return minScore;
    }
}

// ─── Public entry point ───────────────────────────────────────────────────────
// Returns the best move as a pair<from, to> (and sets promotion in the int& out param)
pair<string, string> getBestMove(Board& board, int colour, int depth, int& bestPromotion) {
    vector<SearchMove> moves = generateLegalMoves(board, colour);
    scoreMoves(board, moves, colour);

    string bestFrom, bestTo;
    bestPromotion    = -1;
    int bestScore    = (colour == Board::WHITE) ? INT_MIN : INT_MAX;
    int alpha        = INT_MIN;
    int beta         = INT_MAX;

    for (auto& m : moves) {
        Move mv    = board.makeMove(m.from, m.to, m.promotion);
        int score  = alphaBeta(board, depth - 1, alpha, beta,
                               1 - colour);
        board.unmakeMove(mv);

        bool better = (colour == Board::WHITE) ? score > bestScore
                                               : score < bestScore;
        if (better) {
            bestScore     = score;
            bestFrom      = m.from;
            bestTo        = m.to;
            bestPromotion = m.promotion;
            if (colour == Board::WHITE) alpha = max(alpha, score);
            else                        beta  = min(beta,  score);
        }
    }

    return {bestFrom, bestTo};
}