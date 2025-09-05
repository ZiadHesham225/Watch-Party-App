using System.Collections.Concurrent;
using WatchPartyApp.Models.InMemory;

namespace WatchPartyApp.Services.InMemory
{
    public class InMemoryRoomManager
    {
        private readonly ConcurrentDictionary<string, ConcurrentDictionary<string, RoomParticipant>> _roomParticipants = new();
        private readonly ConcurrentDictionary<string, Queue<ChatMessage>> _roomMessages = new();
        private const int MAX_MESSAGES_PER_ROOM = 50;

        #region Participant Management
        
        public void AddParticipant(string roomId, RoomParticipant participant)
        {
            var participants = _roomParticipants.GetOrAdd(roomId, _ => new ConcurrentDictionary<string, RoomParticipant>());
            participants[participant.Id] = participant;
        }

        public void RemoveParticipant(string roomId, string participantId)
        {
            if (_roomParticipants.TryGetValue(roomId, out var participants))
            {
                participants.TryRemove(participantId, out _);
                
                // Clean up empty rooms
                if (participants.IsEmpty)
                {
                    _roomParticipants.TryRemove(roomId, out _);
                    _roomMessages.TryRemove(roomId, out _);
                }
            }
        }

        public RoomParticipant? GetParticipant(string roomId, string participantId)
        {
            return _roomParticipants.TryGetValue(roomId, out var participants) && 
                   participants.TryGetValue(participantId, out var participant) 
                ? participant 
                : null;
        }

        public List<RoomParticipant> GetRoomParticipants(string roomId)
        {
            return _roomParticipants.TryGetValue(roomId, out var participants) 
                ? participants.Values.OrderBy(p => p.JoinedAt).ToList()
                : new List<RoomParticipant>();
        }

        public RoomParticipant? GetController(string roomId)
        {
            return GetRoomParticipants(roomId).FirstOrDefault(p => p.HasControl);
        }

        public void SetController(string roomId, string participantId)
        {
            if (_roomParticipants.TryGetValue(roomId, out var participants))
            {
                // Remove control from all participants
                foreach (var participant in participants.Values)
                {
                    participant.HasControl = false;
                }

                // Give control to the specified participant
                if (participants.TryGetValue(participantId, out var newController))
                {
                    newController.HasControl = true;
                }
            }
        }

        public void TransferControlToNext(string roomId, string currentControllerId)
        {
            if (!_roomParticipants.TryGetValue(roomId, out var participants))
                return;

            // Get all participants except the one who left, ordered by join time (oldest first)
            var remainingParticipants = participants.Values
                .Where(p => p.Id != currentControllerId)
                .OrderBy(p => p.JoinedAt)
                .ToList();
            
            // First, remove control from all participants
            foreach (var participant in participants.Values)
            {
                participant.HasControl = false;
            }

            // If there are remaining participants, give control to the oldest one
            if (remainingParticipants.Any())
            {
                var nextController = remainingParticipants.First();
                nextController.HasControl = true;
            }
        }

        /// <summary>
        /// Ensures that exactly one participant has control in a room, or none if room is empty.
        /// This method can be used to fix any inconsistent control states.
        /// </summary>
        public void EnsureControlConsistency(string roomId)
        {
            if (!_roomParticipants.TryGetValue(roomId, out var participants) || !participants.Any())
                return;

            var participantsWithControl = participants.Values.Where(p => p.HasControl).ToList();
            
            // If no one has control, give it to the oldest participant
            if (!participantsWithControl.Any())
            {
                var oldestParticipant = participants.Values.OrderBy(p => p.JoinedAt).First();
                oldestParticipant.HasControl = true;
            }
            // If multiple people have control, give it only to the first one (oldest)
            else if (participantsWithControl.Count > 1)
            {
                var sortedControllers = participantsWithControl.OrderBy(p => p.JoinedAt).ToList();
                
                // Keep control for the oldest, remove from others
                for (int i = 1; i < sortedControllers.Count; i++)
                {
                    sortedControllers[i].HasControl = false;
                }
            }
        }

        public int GetParticipantCount(string roomId)
        {
            return _roomParticipants.TryGetValue(roomId, out var participants) ? participants.Count : 0;
        }

        public bool IsParticipantInRoom(string roomId, string participantId)
        {
            return _roomParticipants.TryGetValue(roomId, out var participants) && 
                   participants.ContainsKey(participantId);
        }

        #endregion

        #region Chat Management

        public void AddMessage(string roomId, ChatMessage message)
        {
            var messages = _roomMessages.GetOrAdd(roomId, _ => new Queue<ChatMessage>());
            
            lock (messages)
            {
                messages.Enqueue(message);
                
                // Keep only the last 50 messages
                while (messages.Count > MAX_MESSAGES_PER_ROOM)
                {
                    messages.Dequeue();
                }
            }
        }

        public List<ChatMessage> GetRoomMessages(string roomId)
        {
            if (_roomMessages.TryGetValue(roomId, out var messages))
            {
                lock (messages)
                {
                    return messages.ToList();
                }
            }
            return new List<ChatMessage>();
        }

        public void ClearRoomData(string roomId)
        {
            _roomParticipants.TryRemove(roomId, out _);
            _roomMessages.TryRemove(roomId, out _);
        }

        #endregion

        #region Room Cleanup

        public List<string> GetActiveRoomIds()
        {
            return _roomParticipants.Keys.ToList();
        }

        public void CleanupEmptyRooms()
        {
            var emptyRooms = _roomParticipants
                .Where(kvp => kvp.Value.IsEmpty)
                .Select(kvp => kvp.Key)
                .ToList();

            foreach (var roomId in emptyRooms)
            {
                ClearRoomData(roomId);
            }
        }

        #endregion
    }
}