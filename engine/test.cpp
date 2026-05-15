#include "board.h"
#include <iostream>
#include <string>
using namespace std;

// Declared in search.cpp
pair<string,string> getBestMove(Board&, int colour, int depth, int& promo);

// ─── Helper: print game result ────────────────────────────────────────────────
static void printResult(bool inCheck, int colour) {
    if (inCheck)
        cout << (colour == Board::WHITE ? "Black" : "White") << " wins by checkmate!\n";
    else
        cout << "Stalemate — draw!\n";
}

// ─── Helper: get a valid move from the human ─────────────────────────────────
static pair<string,string> getHumanMove(Board& board, int colour) {
    while (true) {
        cout << "Your move (e.g. e2 e4): ";
        string from, to;
        cin >> from >> to;

        // Basic format validation
        if (from.size() != 2 || to.size() != 2 ||
            from[0] < 'a' || from[0] > 'h' || from[1] < '1' || from[1] > '8' ||
            to[0]   < 'a' || to[0]   > 'h' || to[1]   < '1' || to[1]   > '8') {
            cout << "Invalid format. Use lowercase e.g. e2 e4\n";
            continue;
        }

        // Check a piece of the right colour is on 'from'
        BB fromBB = StringToBB(from);
        bool found = false;
        for (int p = 0; p < 6; p++)
            if (board.pieces[colour][p] & fromBB) { found = true; break; }
        if (!found) {
            cout << "No " << (colour == Board::WHITE ? "white" : "black")
                 << " piece on " << from << "\n";
            continue;
        }

        // Try the move and check legality (doesn't leave own king in check)
        Move m = board.makeMove(from, to);
        bool legal = !board.isInCheck(colour);
        board.unmakeMove(m);
        if (!legal) {
            cout << "Illegal move (leaves your king in check)\n";
            continue;
        }

        return {from, to};
    }
}

// ─── Run one game ─────────────────────────────────────────────────────────────
// humanColour: Board::WHITE or Board::BLACK
// engineFirst: if true, engine plays the very first move (engine is White)
static void playGame(int humanColour, int gameNumber) {
    cout << "\n╔══════════════════════════════════╗\n";
    cout << "║          GAME " << gameNumber
         << (gameNumber == 1 ? " — You are WHITE  " : " — You are BLACK  ")
         << "║\n";
    cout << "╚══════════════════════════════════╝\n\n";

    Board board;
    board.initialise();
    board.print();

    int colour    = Board::WHITE;   // White always moves first
    int engineColour = 1 - humanColour;
    const int DEPTH = 4;

    for (int ply = 0; ply < 200; ply++) {
        cout << "\n--- " << (colour == Board::WHITE ? "White" : "Black") << "'s turn ---\n";

        string from, to;
        int promo = -1;

        if (colour == engineColour) {
            // ── Engine move ──────────────────────────────────────────────────
            // Game 2: engine is White and must open e2->e4
            if (gameNumber == 2 && ply == 0) {
                from  = "e2";
                to    = "e4";
                promo = -1;
                cout << "Engine plays: " << from << " -> " << to << "\n";
            } else {
                auto [f, t] = getBestMove(board, colour, DEPTH, promo);
                if (f.empty()) {
                    printResult(board.isInCheck(colour), colour);
                    return;
                }
                from = f;
                to   = t;
                cout << "Engine plays: " << from << " -> " << to;
                if (promo != -1) {
                    const string names[] = {"pawn","rook","knight","bishop","queen","king"};
                    cout << " (promotes to " << names[promo] << ")";
                }
                cout << "\n";
            }
        } else {
            // ── Human move ───────────────────────────────────────────────────
            auto [f, t] = getHumanMove(board, colour);
            from = f; to = t;

            // Handle promotion input
            BB toBB = StringToBB(to);
            int toIdx = 0;
            while (!((toBB >> toIdx) & 1)) toIdx++;
            bool isPromoRank = (colour == Board::WHITE && toIdx / 8 == 7)
                             || (colour == Board::BLACK && toIdx / 8 == 0);
            BB fromBB = StringToBB(from);
            bool isPawn = (board.pieces[colour][Board::PAWN] & fromBB) != 0;
            if (isPawn && isPromoRank) {
                cout << "Promote to? (q=queen, r=rook, b=bishop, n=knight): ";
                char c; cin >> c;
                switch (c) {
                    case 'r': promo = Board::ROOK;   break;
                    case 'b': promo = Board::BISHOP; break;
                    case 'n': promo = Board::KNIGHT; break;
                    default:  promo = Board::QUEEN;  break;
                }
            }
        }

        board.makeMove(from, to, promo);
        board.print();

        // Check / checkmate / stalemate detection for the *next* player
        int nextColour = 1 - colour;
        if (board.isInCheck(nextColour)) {
            cout << "Check!\n";
            // Quick stalemate/checkmate detection: try to find any legal move
            // (reuse generateLegalMoves logic inline via search — just call
            //  getBestMove; if it returns empty the game is over)
            int dummyPromo;
            auto [f2, t2] = getBestMove(board, nextColour, 1, dummyPromo);
            if (f2.empty()) {
                cout << "Checkmate! "
                     << (colour == Board::WHITE ? "White" : "Black")
                     << " wins!\n";
                return;
            }
        }

        colour = nextColour;
    }
    cout << "Game ended (move limit reached)\n";
}

// ─── Main ─────────────────────────────────────────────────────────────────────
int main() {
    // Game 1: human plays White, engine plays Black
    playGame(Board::WHITE, 1);

    cout << "\n\nPress Enter to start Game 2...\n";
    cin.ignore(); cin.get();

    // Game 2: human plays Black, engine plays White (opens e2->e4)
    playGame(Board::BLACK, 2);

    return 0;
}
