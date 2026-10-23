'use client'

import { useState, useEffect } from 'react'
import { Calendar, Plus, Edit2, Trash2, Search, Clock, MapPin, X, Eye, EyeOff, FolderOpen } from 'lucide-react'
import { useZone } from '@/hooks/useZone'
import CustomLoader from '@/components/CustomLoader'
import { UpcomingEvent, UpcomingEventsService } from '@/app/pages/calendar/_lib/upcoming-events-service'
import MediaSelectionModal from '../MediaSelectionModal'
import moment from 'moment'
import { isHQGroup } from '@/config/zones'
import { BackendAPI } from '@/lib/api-client'

const EVENT_TYPES = [
  { id: 'event', label: 'Event' },
  { id: 'announcement', label: 'Announcement' },
  { id: 'meeting', label: 'Meeting' },
  { id: 'rehearsal', label: 'Rehearsal' },
  { id: 'reminder', label: 'Reminder' },
]

export default function CalendarSection() {
  const { currentZone } = useZone()
  const [events, setEvents] = useState<UpcomingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<UpcomingEvent | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<UpcomingEvent | null>(null)
  const [saving, setSaving] = useState(false)
  const [showMediaLibrary, setShowMediaLibrary] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    date: '',
    endDate: '',
    time: '',
    image: '',
    type: 'event' as UpcomingEvent['type'],
    showInCarousel: true,
    isGlobal: false
  })

  useEffect(() => {
    if (currentZone?.id) {
      loadEvents()
    }
  }, [currentZone?.id])

  const loadEvents = async (silent = false) => {
    if (!currentZone?.id) return
    if (!silent && events.length === 0) setLoading(true)
    try {
      const allEvents = await UpcomingEventsService.getAllEvents(currentZone.id)
      setEvents(allEvents)
    } catch (error) {
 console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleOpenModal = (event?: UpcomingEvent) => {
    if (event) {
      setEditingEvent(event)
      setFormData({
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        date: event.date,
        endDate: event.endDate || '',
        time: event.time || '',
        image: event.image || '',
        type: event.type,
        showInCarousel: event.showInCarousel,
        isGlobal: event.isGlobal || false
      })
    } else {
      setEditingEvent(null)
      setFormData({
        title: '',
        description: '',
        location: '',
        date: moment().format('YYYY-MM-DD'),
        endDate: '',
        time: '',
        image: '',
        type: 'event',
        showInCarousel: true,
        isGlobal: false
      })
    }
    setShowModal(true)
  }

  const handleSaveEvent = async () => {

    if (!formData.title.trim()) {
      showToast('Please enter a title', 'warning')
      return
    }

    if (!formData.date) {
      showToast('Please select a date', 'warning')
      return
    }

    setSaving(true)
    try {
      const eventData: any = {
        title: formData.title.trim(),
        date: formData.date,
        endDate: formData.endDate || null,
        type: formData.type,
        showInCarousel: formData.showInCarousel,
        isGlobal: formData.isGlobal
      }

      // Only add optional fields if they have values
      if (formData.description.trim()) eventData.description = formData.description.trim()
      if (formData.location.trim()) eventData.location = formData.location.trim()
      if (formData.time) eventData.time = formData.time
      if (formData.image) eventData.image = formData.image


      if (editingEvent) {
        await UpcomingEventsService.updateEvent(editingEvent.id, eventData, currentZone!.id)
        showToast('Event updated successfully!', 'success')
      } else {
        const result = await UpcomingEventsService.createEvent({
          ...eventData,
          zoneId: currentZone!.id
        })

        // Send notification for new event
        try {
          await BackendAPI.notifications.send({
            title: ` New ${eventData.type || 'Event'}`,
            message: `"${eventData.title}" has been scheduled for ${moment(eventData.date).format('MMM Do, YYYY')}`,
            type: 'info',
            category: 'announcement',
            priority: 'medium',
            target_audience: 'all',
            zoneId: currentZone?.id || '',
            created_at: new Date().toISOString(),
            event_start_date: new Date(eventData.date).toISOString(),
            event_end_date: eventData.endDate ? new Date(eventData.endDate).toISOString() : new Date(eventData.date).toISOString(),
            is_read: false,
            data: { eventId: (result as any)?.id || '', type: eventData.type }
          }).catch(() => {})
        } catch (fcmError) {
 console.error('[CalendarUI] FCM error:', fcmError)
        }

        showToast('Event created successfully!', 'success')
      }

      setShowModal(false)
      setEditingEvent(null)
      await loadEvents(true)
    } catch (error) {
 console.error('Error saving event:', error)
      showToast('Failed to save event. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const toast = document.createElement('div')
    toast.className = `fixed bottom-20 left-1/2 transform -translate-x-1/2 px-4 py-3 rounded-xl shadow-lg z-[100] text-sm font-medium transition-all ${type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
        type === 'warning' ? 'bg-yellow-500 text-white' :
          'bg-gray-800 text-white'
      }`
    toast.textContent = message
    document.body.appendChild(toast)

    setTimeout(() => {
      toast.style.opacity = '0'
      setTimeout(() => toast.remove(), 300)
    }, 3000)
  }

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return

    try {
      await UpcomingEventsService.deleteEvent(eventToDelete.id, currentZone!.id)
      showToast('Event deleted successfully!', 'success')
      setShowDeleteDialog(false)
      setEventToDelete(null)
      loadEvents(true)
    } catch (error) {
 console.error('Error deleting event:', error)
      showToast('Failed to delete event', 'error')
    }
  }

  const toggleCarouselVisibility = async (event: UpcomingEvent) => {
    try {
      await UpcomingEventsService.updateEvent(event.id, {
        showInCarousel: !event.showInCarousel
      }, currentZone!.id)
      showToast(event.showInCarousel ? 'Hidden from carousel' : 'Added to carousel', 'success')
      loadEvents(true)
    } catch (error) {
 console.error('Error toggling visibility:', error)
      showToast('Failed to update visibility', 'error')
    }
  }

  const themeColor = currentZone?.themeColor || '#10b981'

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'event': return '#8b5cf6'
      case 'announcement': return '#f59e0b'
      case 'meeting': return '#3b82f6'
      case 'rehearsal': return '#10b981'
      case 'reminder': return '#ef4444'
      default: return themeColor
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">Calendar</h1>
            <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Manage events and schedules</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-white rounded-xl font-medium hover:opacity-90 transition-all flex-shrink-0"
            style={{ backgroundColor: themeColor }}
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Event</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-100 shadow-sm">
            <CustomLoader message="Loading events..." />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-500 text-sm mb-4">Create your first event to get started</p>
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 text-white rounded-xl font-medium"
              style={{ backgroundColor: themeColor }}
            >
              Add Event
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex gap-3">
                  {/* Image or Color Bar */}
                  {event.image ? (
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-2 sm:w-1.5 rounded-full self-stretch flex-shrink-0"
                      style={{ backgroundColor: getTypeColor(event.type), minHeight: '60px' }}
                    />
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Title & Type */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-1">{event.title}</h3>
                      <span
                        className="px-1.5 py-0.5 text-[10px] sm:text-xs font-medium rounded-full text-white flex-shrink-0"
                        style={{ backgroundColor: getTypeColor(event.type) }}
                      >
                        {event.type}
                      </span>
                      {event.showInCarousel && (
                        <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-medium rounded-full bg-green-100 text-green-700 flex-shrink-0">
                          Carousel
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {event.description && (
                      <p className="text-xs sm:text-sm text-gray-500 line-clamp-1 mb-2">{event.description}</p>
                    )}

                    {/* Date & Location */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {moment(event.date).format('MMM D')}
                          {event.endDate && event.endDate !== event.date ? ` - ${moment(event.endDate).format('MMM D')}` : ''}
                          {event.time ? ` • ${event.time}` : ''}
                        </span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[120px]">{event.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions - Mobile Friendly */}
                    <div className="flex items-center gap-1 mt-3">
                      <button
                        onClick={() => toggleCarouselVisibility(event)}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${event.showInCarousel
                          ? 'text-green-600 bg-green-50 hover:bg-green-100'
                          : 'text-gray-500 bg-gray-50 hover:bg-gray-100'
                          }`}
                      >
                        {event.showInCarousel ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{event.showInCarousel ? 'Visible' : 'Hidden'}</span>
                      </button>
                      <button
                        onClick={() => handleOpenModal(event)}
                        className="flex items-center gap-1 px-2 py-1.5 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                      <button
                        onClick={() => {
                          setEventToDelete(event)
                          setShowDeleteDialog(true)
                        }}
                        className="flex items-center gap-1 px-2 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Event Modal - Full Screen on Mobile */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[80]">
          <div className="bg-white w-full sm:rounded-2xl sm:w-full sm:max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col rounded-t-2xl sm:mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingEvent ? 'Edit Event' : 'Add Event'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
                  placeholder="Event title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-base resize-none"
                  rows={3}
                  placeholder="Event description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as UpcomingEvent['type'] })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-base bg-white"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
                  placeholder="Event location"
                />
              </div>

              {/* Date & Time - Stack on mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        date: e.target.value,
                        // If end date is empty or before new start date, update it to match
                        endDate: (!prev.endDate || prev.endDate < e.target.value) ? e.target.value : prev.endDate
                      }))
                    }}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    min={formData.date}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
                  />
                </div>
              </div>

              {/* Image/Ecard from Media Library */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Event Image</label>
                {formData.image ? (
                  <div className="relative">
                    <img
                      src={formData.image}
                      alt="Event ecard"
                      className="w-full h-36 sm:h-40 object-cover rounded-xl border border-gray-200"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowMediaLibrary(true)}
                        className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-sm transition-colors"
                      >
                        <FolderOpen className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image: '' })}
                        className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-sm transition-colors"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowMediaLibrary(true)}
                    className="w-full h-28 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-purple-400 hover:bg-purple-50/50 transition-colors"
                  >
                    <FolderOpen className="w-7 h-7 text-gray-400" />
                    <span className="text-sm text-gray-500">Select from Media Library</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-3 p-4 bg-purple-50 rounded-xl">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showInCarousel}
                    onChange={(e) => setFormData({ ...formData, showInCarousel: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300"
                    style={{ accentColor: themeColor }}
                  />
                  <span className="text-sm font-semibold text-gray-700">Show in calendar carousel</span>
                </label>

                {/* Only show Global option to HQ groups or Boss */}
                {isHQGroup(currentZone?.id) && (
                  <label className="flex items-center gap-3 cursor-pointer pt-2 border-t border-purple-100">
                    <input
                      type="checkbox"
                      checked={formData.isGlobal}
                      onChange={(e) => setFormData({ ...formData, isGlobal: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300"
                      style={{ accentColor: '#9333ea' }}
                    />
                    <div>
                      <span className="text-sm font-bold text-purple-700">Make Global Event</span>
                      <p className="text-[10px] text-purple-400">This event will be visible to ALL zones on the platform.</p>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Modal Footer - Fixed */}
            <div className="flex gap-3 p-4 border-t border-gray-200 flex-shrink-0 bg-white">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={saving || !formData.title.trim() || !formData.date}
                className="flex-1 px-4 py-3 text-white rounded-xl font-medium hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: themeColor }}
              >
                {saving ? (
                  <>
                    <CustomLoader size="sm" />
                    <span className="ml-2">Saving...</span>
                  </>
                ) : (
                  editingEvent ? 'Update' : 'Create'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete Event?</h3>
            <p className="text-gray-500 text-center text-sm mb-6">
              "{eventToDelete?.title}" will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteDialog(false)
                  setEventToDelete(null)
                }}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Library Modal */}
      <MediaSelectionModal
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onFileSelect={(file) => {
          setFormData({ ...formData, image: file.url })
          setShowMediaLibrary(false)
        }}
        allowedTypes={['image']}
        title="Select Event Image"
      />
    </div>
  )
}
