// js/ui/notifications.js

export function showNotification(message, type) {
    const notificationDiv = document.createElement('div');
    notificationDiv.textContent = message;
    notificationDiv.classList.add('notification', 'fixed', 'bottom-4', 'left-1/2', '-translate-x-1/2', 'px-4', 'py-2', 'rounded-lg', 'shadow-lg', 'text-white', 'z-50');

    if (type === 'success') {
        notificationDiv.classList.add('bg-green-500');
    } else if (type === 'error') {
        notificationDiv.classList.add('bg-red-500');
    } else if (type === 'warning') {
        notificationDiv.classList.add('bg-yellow-500');
    }

    document.body.appendChild(notificationDiv);

    setTimeout(() => {
        notificationDiv.remove();
    }, 3000);
}